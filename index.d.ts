export function formatSQL(sql: string, ...matches: any[][]): [string, Buffer[]];
export class PostgresClient {
    /**
     * @param {PostgreSQL.PoolClient} client
     * @param {Postgres} parent
     */
    constructor(client: PostgreSQL.PoolClient, parent: Postgres);
    /** @type {PostgreSQL.PoolClient} */
    client: PostgreSQL.PoolClient;
    /** @type {Postgres} */
    parent: Postgres;
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
    query(sql: string, ...params: any[]): Promise<number | any[] | PostgreSQL.QueryResult<any>>;
    /**
     *
     * @param {string} sql
     * @param {...any} params
     */
    queryOne(sql: string, ...params: any[]): Promise<any>;
    begin(): Promise<PostgreSQL.QueryResult<any>>;
    commit(): Promise<PostgreSQL.QueryResult<any>>;
    rollback(): Promise<PostgreSQL.QueryResult<any>>;
    /**
     * @param {boolean|Error} [error]
     */
    close(error?: boolean | Error): Promise<any>;
}
export default class Postgres {
    /**
     * @param {AuthInfo} auth
     * @param {DatabaseOption} [option={}]
     */
    constructor(auth: AuthInfo, option?: DatabaseOption);
    /** @type {string} */
    name: string;
    /** @type {PostgreSQL.Pool} */
    pool: PostgreSQL.Pool;
    /** @type {string} */
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
    query(sql: string, ...params: any[]): Promise<number | any[] | PostgreSQL.QueryResult<any>>;
    /**
     * @param {string} sql
     * @param {...any} params
     */
    queryOne(sql: string, ...params: any[]): Promise<any>;
}
/**
 * Database connection auth info
 */
export type AuthInfo = {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    max: number;
};
/**
 * Database Option
 */
export type DatabaseOption = {
    name?: string;
    /**
     * - `undefined` for use `console` functions
     * - `false` for close output
     * - `Function` for output non-leveled logs
     * - `{LogFunctions}` for leveled logs. The function will be called in the format of where, what and result. **ATTENTION** The Error instance will be passed in as one of the result arguments, not stringified error text.
     */
    logger?: typeof injectBaseLogger;
};
import PostgreSQL from "pg";
import { injectBaseLogger } from "@nuogz/utility";
