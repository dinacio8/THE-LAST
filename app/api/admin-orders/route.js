import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT id, ticket_id, invoice_id, first_name, last_name, email, address,
             price, status, type, created_at
      FROM orders
      ORDER BY created_at DESC
    `);
    return NextResponse.json(rows);
  } catch (e) {
    console.error("admin-orders:", e);
    return NextResponse.json({ error: "Erreur récupération commandes" }, { status: 500 });
  }
}
