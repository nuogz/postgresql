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
    query(sql: string, ...params: any[]): Promise<number | any[] | PostgreSQL.QueryResult<any> | null>;
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
    close(error?: boolean | Error | undefined): Promise<any>;
}
export default class Postgres {
    /**
     * @param {AuthInfo} auth
     * @param {DatabaseOption} [option={}]
     */
    constructor(auth: AuthInfo, option?: import("./bases.d.ts").DatabaseOption | undefined);
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
     * @param {Error|any} error
     * @param {PostgresClient} connection
     * @returns {Promise<any>}
     */
    handleErrorTransaction(error: Error | any, connection: PostgresClient): Promise<any>;
    /**
     * @param {TransactionHandle} handle
     * @param {string} [usage]
     * @returns {Promise<any>}
     */
    pickTransaction(handle: TransactionHandle, usage?: string | undefined, handleError?: (error: Error | any, connection: PostgresClient) => Promise<any>): Promise<any>;
    /**
     * @param {string} sql
     * @param {...any} params
     */
    query(sql: string, ...params: any[]): Promise<number | any[] | PostgreSQL.QueryResult<any> | null>;
    /**
     * @param {string} sql
     * @param {...any} params
     */
    queryOne(sql: string, ...params: any[]): Promise<any>;
}
export type AuthInfo = import("./bases.d.ts").AuthInfo;
export type DatabaseOption = import("./bases.d.ts").DatabaseOption;
export type TransactionHandle = import("./bases.d.ts").TransactionHandle;
import PostgreSQL from 'pg';
