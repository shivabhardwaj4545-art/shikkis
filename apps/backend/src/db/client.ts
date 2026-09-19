import pkg from 'pg';
import dotenv from 'dotenv';

import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pkg;

const poolConfig: pkg.PoolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'Shiva@123',
      database: process.env.PGDATABASE || 'shikkis',
    };

export const pool = new Pool(poolConfig);


/**
 * Parses SQL and parameters:
 * Handles both @named parameters with object input:
 *   SQL: "INSERT INTO users (id, email) VALUES (@id, @email)"
 *   Params: [{ id: '1', email: 'a@b.com' }]
 * and positional `?` parameters with array/args input:
 *   SQL: "SELECT * FROM users WHERE email = ?"
 *   Params: ['a@b.com']
 */
export function parseSqlAndParams(sql: string, params: any[]): { text: string; values: any[] } {
  if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
    const obj = params[0];
    const paramKeys: string[] = [];
    const text = sql.replace(/@([a-zA-Z0-9_]+)/g, (_, key) => {
      paramKeys.push(key);
      return `$${paramKeys.length}`;
    });
    // If SQL had @ parameters, construct value array from object
    if (paramKeys.length > 0) {
      const values = paramKeys.map((key) => (obj[key] !== undefined ? obj[key] : null));
      return { text, values };
    }
  }

  let paramIndex = 1;
  const text = /\$\d+/.test(sql) ? sql : sql.replace(/\?/g, () => `$${paramIndex++}`);
  const values = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
  return { text, values };
}

export interface DbClient {
  query<T = any>(sql: string, ...params: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, ...params: any[]): Promise<T | null>;
  execute(sql: string, ...params: any[]): Promise<{ rowCount: number }>;
  exec(sql: string): Promise<void>;
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
  prepare(sql: string): {
    get(...params: any[]): Promise<any>;
    all(...params: any[]): Promise<any[]>;
    run(...params: any[]): Promise<{ changes: number }>;
  };
}

export const db: DbClient = {
  async query<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    const { text, values } = parseSqlAndParams(sql, params);
    const res = await pool.query(text, values);
    return res.rows as T[];
  },

  async queryOne<T = any>(sql: string, ...params: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, ...params);
    return rows.length > 0 ? rows[0] : null;
  },

  async execute(sql: string, ...params: any[]): Promise<{ rowCount: number }> {
    const { text, values } = parseSqlAndParams(sql, params);
    const res = await pool.query(text, values);
    return { rowCount: res.rowCount ?? 0 };
  },

  async exec(sql: string): Promise<void> {
    await pool.query(sql);
  },

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txClient = {
        async query<R = any>(sql: string, ...params: any[]): Promise<R[]> {
          const { text, values } = parseSqlAndParams(sql, params);
          const res = await client.query(text, values);
          return res.rows as R[];
        },
        async queryOne<R = any>(sql: string, ...params: any[]): Promise<R | null> {
          const { text, values } = parseSqlAndParams(sql, params);
          const res = await client.query(text, values);
          return res.rows.length > 0 ? (res.rows[0] as R) : null;
        },
        async execute(sql: string, ...params: any[]): Promise<{ rowCount: number }> {
          const { text, values } = parseSqlAndParams(sql, params);
          const res = await client.query(text, values);
          return { rowCount: res.rowCount ?? 0 };
        },
        prepare(sql: string) {
          return {
            async get(...params: any[]): Promise<any> {
              const { text, values } = parseSqlAndParams(sql, params);
              const res = await client.query(text, values);
              return res.rows.length > 0 ? res.rows[0] : null;
            },
            async all(...params: any[]): Promise<any[]> {
              const { text, values } = parseSqlAndParams(sql, params);
              const res = await client.query(text, values);
              return res.rows;
            },
            async run(...params: any[]): Promise<{ changes: number }> {
              const { text, values } = parseSqlAndParams(sql, params);
              const res = await client.query(text, values);
              return { changes: res.rowCount ?? 0 };
            },
          };
        },
      };
      const result = await callback(txClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  prepare(sql: string) {
    return {
      async get(...params: any[]): Promise<any> {
        const { text, values } = parseSqlAndParams(sql, params);
        const res = await pool.query(text, values);
        return res.rows.length > 0 ? res.rows[0] : null;
      },
      async all(...params: any[]): Promise<any[]> {
        const { text, values } = parseSqlAndParams(sql, params);
        const res = await pool.query(text, values);
        return res.rows;
      },
      async run(...params: any[]): Promise<{ changes: number }> {
        const { text, values } = parseSqlAndParams(sql, params);
        const res = await pool.query(text, values);
        return { changes: res.rowCount ?? 0 };
      },
    };
  },
};

export const getDb = (): DbClient => db;
export default db;
