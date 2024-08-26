import { injectBaseLogger } from '@nuogz/utility';

import { PostgresClient } from './index.js';



/** Database connection auth info */
export type AuthInfo = {
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
	max: number;
};


/** Database Option */
export type DatabaseOption = {
	name?: string | undefined;
	/**
	 * - `undefined` for use `console` functions
	 * - `false` for close output
	 * - `Function` for output non-leveled logs
	 * - `{LogFunctions}` for leveled logs. The function will be called in the format of where, what and result. **ATTENTION** The Error instance will be passed in as one of the result arguments, not stringified error text.
	 */
	logger?: typeof injectBaseLogger | undefined;
};


export type TransactionHandle = (connection: PostgresClient) => Promise<any>;
