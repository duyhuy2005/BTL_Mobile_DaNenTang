import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.DB_SERVER || 'ACER\\MS1SQLSERVER',
  database: process.env.DB_DATABASE || 'QuanLyCuaHangMyPham',
  user: process.env.DB_USER || 'beauty_user',
  password: process.env.DB_PASSWORD || 'Beauty@2024',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 30000,
  connectionTimeout: 30000,
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('✅ Kết nối SQL Server thành công!');
      console.log(`   Database: ${config.database}`);
    } catch (err) {
      console.error('❌ Lỗi kết nối:', err);
      throw err;
    }
  }
  return pool;
}

export async function query<T = any>(sqlStr: string, params: Record<string, any> = {}): Promise<T[]> {
  const p = await getPool();
  const request = p.request();
  
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      request.input(key, sql.NVarChar, null);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        request.input(key, sql.Int, value);
      } else {
        request.input(key, sql.Decimal(18, 2), value);
      }
    } else if (value instanceof Date) {
      request.input(key, sql.DateTime, value);
    } else {
      request.input(key, sql.NVarChar, String(value));
    }
  }
  
  const result = await request.query(sqlStr);
  return result.recordset as T[];
}

export async function queryOne<T = any>(sqlStr: string, params: Record<string, any> = {}): Promise<T | null> {
  const rows = await query<T>(sqlStr, params);
  return rows[0] || null;
}

export async function execute(sqlStr: string, params: Record<string, any> = {}): Promise<{ rowsAffected: number; recordset: any[] }> {
  const p = await getPool();
  const request = p.request();
  
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      request.input(key, sql.NVarChar, null);
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        request.input(key, sql.Int, value);
      } else {
        request.input(key, sql.Decimal(18, 2), value);
      }
    } else if (value instanceof Date) {
      request.input(key, sql.DateTime, value);
    } else {
      request.input(key, sql.NVarChar, String(value));
    }
  }
  
  const result = await request.query(sqlStr);
  return {
    rowsAffected: result.rowsAffected[0] || 0,
    recordset: result.recordset,
  };
}

export { sql };
