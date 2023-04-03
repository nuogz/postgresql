import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import PostgreSQL from 'pg';

import { TT, loadI18NResource } from '@nuogz/i18n';
import { injectBaseLogger } from '@nuogz/utility';



/**
 * Database connection auth info
 * @typedef {Object} AuthInfo
 * @property {string} host
 * @property {number} port
 * @property {string} database
 * @property {string} user
 * @property {string} password
 * @property {number} max
 */


/**
 * Database Option
 * @typedef {Object} DatabaseOption
 * @property {string} [name]
 * @property {import('@nuogz/utility').injectBaseLogger} [logger]
 * - `undefined` for use `console` functions
 * - `false` for close output
 * - `Function` for output non-leveled logs
 * - `{LogFunctions}` for leveled logs. The function will be called in the format of where, what and result. **ATTENTION** The Error instance will be passed in as one of the result arguments, not stringified error text.
 */



loadI18NResource('@nuogz/postgresql', resolve(dirname(fileURLToPath(import.meta.url)), 'locale'));


const T = TT('@nuogz/postgresql');



const formatCommonData = (match, values, type = typeof match, wild) => {
	if(type == 'number' || type == 'bigint1') {
		return match;
	}
	else if(type == 'string') {
		return wild == '$r' ? match.replace(/'/g, '\'\'') : `'${match.replace(/'/g, '\'\'')}'`;
	}
	else if(type == 'boolean') {
		return match.toString().toUpperCase();
	}
	else if(match == null) {
		return 'NULL';
	}
	else if(match instanceof Array) {
		match = match.map(m => formatCommonData(m, values, typeof m, wild)).join(', ');

		if(wild != '$r') {
			if(match.length) {
				return `ARRAY[${match}]`;
			}
			else {
				return '\'{}\'';
			}
		}

		return match;
	}
	else if(match instanceof Buffer) {
		return `$${values.push(match)}`;
	}


	throw T('error.unknownWildType', { type }, 'PostgresSQL.formatCommonData');
};

const formatIdentifier = identifier => `"${identifier}"`;

/**
 * - Number|Bigint  : 1 ==> 1
 * - String         : `a` ==> 'a'
 * - String with $$ : `a` ==> "a"
 * - String with $r : `a` ==> a
 * - Boolean        : true ==> TRUE
 * - Null           : null ==> NULL
 * - Array          : [1, `a`, true] ==> ARRAY[1, 'a', TRUE]
 * - Array with $r  : [1, `a`, true] ==> 1, 'a', TRUE
 * - Object         : { a: 1, b: `a` } ==> a=1, b='a'
 * - Object with $i : { a: 1, b: `a` } ==> (a, b) VALUES (1, 'a')
 * - Buffer         : Do nothing. It should be passed until parameterized query
 * @param {string} sql
 * @param {...any[]} matches
 * @returns {[string, Buffer[]]}
 */
export const formatSQL = (sql, ...matches) => {
	let index = 0;
	const values = [];
	const sqlFormatted = sql.replace(/\$(r|i|\$)?/g, (wild, p1, indexMatch) => {
		const match = matches[index++];
		const type = typeof match;

		try {
			// check special match
			if(wild == '$i' && type != 'object') {
				throw T('error.wildType.i', { type: match }, 'PostgresSQL.formatSQL');
			}
			if(wild == '$r' && !(match instanceof Array || type == 'string')) {
				throw T('error.wildType.r', { type: match }, 'PostgresSQL.formatSQL');
			}

			// match `undefined` will return original string
			if(match === undefined) { return wild; }


			// handle identifier
			if(wild == '$$') {
				if(type != 'string') {
					throw T('error.wildType.$', { type: match }, 'PostgresSQL.formatSQL');
				}

				return formatIdentifier(match);
			}
			// handle object
			else if(type == 'object' && !(match instanceof Array)) {
				const entries = Object.entries(match);

				// special format for insertion
				if(wild == '$i') {
					const keys = [];
					const vals = [];

					entries.forEach(([key, value]) => {
						keys.push(formatIdentifier(key));
						vals.push(formatCommonData(value, values, typeof value, undefined));
					});

					return `(${keys.join(', ')})VALUES(${vals.join(', ')})`;
				}

				// key pair string by default
				return entries
					.map(([key, value]) =>
						`${formatIdentifier(key)}=${formatCommonData(value, values, typeof value, undefined)}`
					)
					.join(', ');
			}

			// handle common data
			return formatCommonData(match, values, type, wild);
		}
		catch(error) {
			if(typeof error == 'string') {
				throw `${error}, ${T('error.position', { index: indexMatch })}`;
			}
			else {
				throw error;
			}
		}
	});

	return [sqlFormatted, values];
};

/**
 * @param {PostgreSQL.QueryResult} result
 */
const parseResult = result => {
	if(result.command == 'INSERT' || result.command == 'UPDATE' || result.command == 'DELETE') {
		if(result.rows.length) {
			return result.rows;
		}
		else {
			return result.rowCount;
		}
	}
	else if(result.command == 'SELECT') {
		return result.rows;
	}
	else {
		return result;
	}
};



export class PostgresClient {
	/** @type {PostgreSQL.PoolClient} */
	client;
	/** @type {Postgres} */
	parent;



	/**
	 * @param {PostgreSQL.PoolClient} client
	 * @param {Postgres} parent
	 */
	constructor(client, parent) {
		this.client = client;
		this.parent = parent;
	}

	/**
	 * @param {string} sql
	 * @param {...any} params
	 */
	format(sql, ...params) { return formatSQL(sql, ...params); }

	/**
	 *
	 * @param {string} sql
	 * @param {...any} params
	 */
	async query(sql, ...params) {
		const [sqlForamted, values] = formatSQL(sql, ...params);
		const result = await this.client.query(sqlForamted, values);

		return parseResult(result);
	}
	/**
	 *
	 * @param {string} sql
	 * @param {...any} params
	 */
	async queryOne(sql, ...params) {
		const [sqlForamted, values] = formatSQL(sql, ...params);
		const result = await this.client.query(sqlForamted, values);

		return parseResult(result)[0];
	}


	begin() {
		return this.client.query('BEGIN');
	}
	commit() {
		return this.client.query('COMMIT');
	}
	rollback() {
		return this.client.query('ROLLBACK');
	}

	/**
	 * @param {boolean|Error} [error]
	 */
	close(error) {
		return new Promise(resolve => {
			this.client.once('end', () => resolve());
			this.client.release(error);
		});
	}
}



export default class Postgres {
	/** @type {string} */
	name = T('Database');


	/** @type {PostgreSQL.Pool} */
	pool;
	/** @type {string} */
	user;


	/**
	 * @param {AuthInfo} auth
	 * @param {DatabaseOption} [option={}]
	 */
	constructor(auth, option = {}) {
		this.name = Reflect.has(option, 'name') ? option.name : this.name;


		injectBaseLogger(this, Object.assign({ name: this.name }, option.logger));


		this.pool = new PostgreSQL.Pool({
			host: auth.host,
			port: auth.port,
			database: auth.database,
			user: auth.user,
			password: auth.password,
			max: auth.max ?? 48,
		});

		this.user = auth.user;


		return this.pool.query('SHOW CLIENT_ENCODING')
			.then(result => {
				this.logDebug(T('connectDatabase', { name: this.name }), T('connectDatabaseParam', { user: this.user, encoding: result.rows?.[0]?.client_encoding }));

				return this;
			});
	}

	async disconnect() {
		await this.pool.end();

		return this.logDebug(T('disconnectDatabase', { name: this.name }), T('disconnectDatabaseParam', { user: this.user }));
	}

	/**
	 * @param {string} sql
	 * @param {...any} params
	 */
	format(sql, ...params) { return formatSQL(sql, ...params); }

	async pick() { return new PostgresClient(await this.pool.connect(), this); }

	/**
	 * @param {string} sql
	 * @param {...any} params
	 */
	async query(sql, ...params) {
		const [sqlForamted, valuesBuffer] = formatSQL(sql, ...params);
		const result = await this.pool.query(sqlForamted, valuesBuffer);

		return parseResult(result);
	}
	/**
	 * @param {string} sql
	 * @param {...any} params
	 */
	async queryOne(sql, ...params) {
		const [sqlForamted, valuesBuffer] = formatSQL(sql, ...params);
		const result = await this.pool.query(sqlForamted, valuesBuffer);

		return parseResult(result)[0];
	}
}
