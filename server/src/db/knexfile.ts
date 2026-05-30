import dotenv from 'dotenv';
import path from 'path';
import type { Knex } from 'knex';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const knexConfig: Knex.Config = {
  client: 'mssql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'live_commerce_hub',
    options: {
      trustServerCertificate: true,
      encrypt: false,
    },
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: path.resolve(__dirname, 'migrations'),
    extension: 'ts',
  },
  seeds: {
    directory: path.resolve(__dirname, 'seeds'),
    extension: 'ts',
  },
};

export default knexConfig;
