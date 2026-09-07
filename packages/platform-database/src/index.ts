import { Pool, type PoolConfig } from 'pg';

export type DatabaseConfig = {
  connectionString: string;
  max?: number;
};

export const connectProductDatabase = async (config: DatabaseConfig): Promise<Pool> => {
  const pool = new Pool(config as PoolConfig);
  await pool.query('SELECT 1');
  return pool;
};
