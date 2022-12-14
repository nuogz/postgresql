import PostgreSQL from 'pg';

import LoggerInjecter from '@nuogz/class-inject-leveled-log';

import { TT } from './lib/i18n.js';



const formatCommonData = (match, values, type = typeof match, wild, tt) => {
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
		match = match.map(m => formatCommonData(m, values, typeof m, wild, tt)).join(', ');

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

	throw tt('error.unSupportDataType', { type: match, typeType: type });
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
 * @param {any[]} matches
 * @param {string} locale
 * @returns {[string, Buffer[]]}
 */
export const formatSQL = (sql, matches = [], locale) => {
	const tt = TT(locale);

	let index = 0;
	const values = [];
	const sqlFormatted = sql.replace(/\$(r|i|\$)?/g, (wild, p1, indexMatch) => {
		const match = matches[index++];
		const type = typeof match;

		// check special match
		if(wild == '$i' && type != 'object') {
			throw tt('error.wildType.i', { type: match, typeType: type });
		}
		if(wild == '$r' && !(match instanceof Array || type == 'string')) {
			throw tt('error.wildType.r', { type: match, typeType: type });
		}

		try {
			// match `undefined` will return original string
			if(match === undefined) { return wild; }


			// handle identifier
			if(wild == '$$') {
				if(type != 'string') {
					throw tt('error.wildType.$', { type: match, typeType: type });
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
						vals.push(formatCommonData(value, values, typeof value, undefined, tt));
					});

					return `(${keys.join(', ')})VALUES(${vals.join(', ')})`;
				}

				// key pair string by default
				return entries
					.map(([key, value]) =>
						`${formatIdentifier(key)}=${formatCommonData(value, values, typeof value, undefined, tt)}`
					)
					.join(', ');
			}

			// handle common data
			return formatCommonData(match, values, type, wild, tt);
		}
		catch(error) {
			if(typeof error == 'string') {
				throw `${error}, ${tt('error.position', { index: indexMatch })}`;
			}
			else {
				throw error;
			}
		}
	});

	return [sqlFormatted, values];
};

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
	/**
	 * @type {PostgreSQL.PoolClient}
	 */
	client;
	/**
	 * @type {Postgres}
	 */
	parent;
	/**
	 * @type {String}
	 */
	locale;

	constructor(client, parent, locale) {
		this.client = client;
		this.parent = parent;
		this.locale = locale;
	}

	format(sql, ...params) { return formatSQL(sql, params, this.locale); }

	async query(sql, ...params) {
		const [sqlForamted, values] = formatSQL(sql, params, this.locale);
		const result = await this.client.query(sqlForamted, values);

		return parseResult(result);
	}
	async queryOne(sql, ...params) {
		const [sqlForamted, values] = formatSQL(sql, params, this.locale);
		const result = await this.client.query(sqlForamted, values);

		return parseResult(result)[0];
	}

	async begin() {
		return this.client.query('BEGIN');
	}
	async commit() {
		return this.client.query('COMMIT');
	}
	async rollback() {
		return this.client.query('ROLLBACK');
	}

	close(error) {
		return new Promise(resolve => {
			this.client.once('end', () => resolve());
			this.client.release(error);
		});
	}
}


export default class Postgres {
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
	 * @property {string} [locale]
	 * @property {import('@nuogz/class-inject-leveled-log').LogOption} [logger]
	 * - `undefined` for use `console` functions
	 * - `false` for close output
	 * - `Function` for output non-leveled logs
	 * - `{LogFunctions}` for leveled logs. The function will be called in the format of where, what and result. **ATTENTION** The Error instance will be passed in as one of the result arguments, not stringified error text.
	 */

	/**
	 * @param {AuthInfo} auth
	 * @param {DatabaseOption} [option={}]
	 */
	constructor(auth, option = {}) {
		this.name = option.name;


		this.locale = option.locale;
		this.TT = TT(this.locale);


		LoggerInjecter(this, Object.assign({ name: this.TT('Database') }, option.logger));


		/**
		 * @type {PostgreSQL.Pool}
		 */
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
				this.logDebug(this.TT('connectDatabase'), this.TT('connectDatabaseParam', { user: this.user, encoding: result.rows?.[0]?.client_encoding }));

				return this;
			});
	}

	async disconnect() {
		await this.pool.end();

		return this.logDebug(this.TT('disconnectDatabase'), this.TT('disconnectDatabaseParam', { user: this.user }));
	}


	format(sql, ...params) { return formatSQL(sql, params, this.locale); }

	async pick() { return new PostgresClient(await this.pool.connect(), this, this.locale); }

	async query(sql, ...params) {
		const [sqlForamted, valuesBuffer] = formatSQL(sql, params, this.locale);
		const result = await this.pool.query(sqlForamted, valuesBuffer);

		return parseResult(result);
	}
	async queryOne(sql, ...params) {
		const [sqlForamted, valuesBuffer] = formatSQL(sql, params, this.locale);
		const result = await this.pool.query(sqlForamted, valuesBuffer);

		return parseResult(result)[0];
	}
}
