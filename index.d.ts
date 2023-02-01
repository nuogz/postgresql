export function formatSQL(sql: string, matches: any[], locale: string): [string, Buffer[]];
export class PostgresClient {
    /**
     * @param {PostgreSQL.PoolClient} client
     * @param {Postgres} parent
     * @param {string} locale
     */
    constructor(client: PostgreSQL.PoolClient, parent: Postgres, locale: string);
    /**
     * @type {PostgreSQL.PoolClient}
     */
    client: PostgreSQL.PoolClient;
    /**
     * @type {Postgres}
     */
    parent: Postgres;
    /**
     * @type {String}
     */
    locale: string;
    /**
     * @param {string} sql
     * @param {...any} params
     */
    format(sql: string, ...params: any[]): [string, Buffer[]];
    /**
     *
     * @param {string} sql
     * @param {...any} params
     */
    query(sql: string, ...params: any[]): Promise<any>;
    /**
     *
     * @param {string} sql
     * @param {...any} params
     */
    queryOne(sql: string, ...params: any[]): Promise<any>;
    begin(): any;
    commit(): any;
    rollback(): any;
    /**
     * @param {boolean|Error} [error]
     */
    close(error?: boolean | Error): any;
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
     * @property {import('@nuogz/utility').injectBaseLogger} [logger]
     * - `undefined` for use `console` functions
     * - `false` for close output
     * - `Function` for output non-leveled logs
     * - `{LogFunctions}` for leveled logs. The function will be called in the format of where, what and result. **ATTENTION** The Error instance will be passed in as one of the result arguments, not stringified error text.
     */
    /**
     * @param {AuthInfo} auth
     * @param {DatabaseOption} [option={}]
     */
    constructor(auth: {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
        max: number;
    }, option?: {
        name?: string;
        locale?: string;
        /**
         * - `undefined` for use `console` functions
         * - `false` for close output
         * - `Function` for output non-leveled logs
         * - `{LogFunctions}` for leveled logs. The function will be called in the format of where, what and result. **ATTENTION** The Error instance will be passed in as one of the result arguments, not stringified error text.
         */
        logger?: typeof injectBaseLogger;
    });
    name: string;
    locale: string;
    TT: (key: import("i18next").TFunctionKeys, options: import("i18next").TOptions<import("i18next").StringMap>) => import("i18next").TFunctionDetailedResult<object>;
    /**
     * @type {PostgreSQL.Pool}
     */
    pool: PostgreSQL.Pool;
    user: string;
    disconnect(): Promise<any>;
    /**
     * @param {string} sql
     * @param {...any} params
     */
    format(sql: string, ...params: any[]): [string, Buffer[]];
    pick(): Promise<PostgresClient>;
    /**
     * @param {string} sql
     * @param {...any} params
     */
    query(sql: string, ...params: any[]): Promise<any>;
    /**
     * @param {string} sql
     * @param {...any} params
     */
    queryOne(sql: string, ...params: any[]): Promise<any>;
}
import { injectBaseLogger } from "@nuogz/utility";
