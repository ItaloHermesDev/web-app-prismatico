import "server-only";

import mysql, { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

const globalForDb = globalThis as unknown as { pool?: mysql.Pool };

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

export const pool =
  globalForDb.pool ??
  mysql.createPool({
    host: requiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 3306),
    user: requiredEnv("DB_USER"),
    password: requiredEnv("DB_PASSWORD"),
    database: requiredEnv("DB_NAME"),
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    connectTimeout: 15000,
    dateStrings: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

const USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY users_email_unique (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

let usersTableReady: Promise<void> | null = null;

export function ensureUsersTable() {
  usersTableReady ??= pool.query(USERS_TABLE).then(() => undefined);
  return usersTableReady;
}

export type UserRecord = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
};

type UserRow = RowDataPacket & UserRecord;

export async function findUserByEmail(email: string) {
  await ensureUsersTable();
  const [rows] = await pool.execute<UserRow[]>(
    "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: number) {
  await ensureUsersTable();
  const [rows] = await pool.execute<UserRow[]>(
    "SELECT id, name, email, password_hash FROM users WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0] ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  await ensureUsersTable();
  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
    [input.name, input.email, input.passwordHash],
  );
  return result.insertId;
}

export function isDuplicateEmailError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
}
