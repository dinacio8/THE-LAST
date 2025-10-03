import mysql from "mysql2/promise";

export async function query(sql, params) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  const [results] = await connection.execute(sql, params);
  await connection.end();
  return results;
}
