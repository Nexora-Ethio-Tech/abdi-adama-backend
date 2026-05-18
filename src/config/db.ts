import pool from './database';
export default pool;
export const query = (text: string, params?: any[]) => pool.query(text, params);
