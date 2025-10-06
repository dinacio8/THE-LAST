import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "session_id manquant" }, { status: 400 });

  try {
    const { rows } = await pool.query(
      `SELECT first_name, last_name, email, type, price, status, created_at, ticket_id, invoice_id
         FROM orders WHERE stripe_session_id = $1`,
      [sessionId]
    );
    if (!rows.length) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

    const o = rows[0];
    return NextResponse.json({
      status: o.status,
      firstName: o.first_name,
      lastName:  o.last_name,
      email:     o.email,
      type:      o.type,
      price:     o.price,
      createdAt: o.created_at,
      ticket:    o.ticket_id,
      invoice:   o.invoice_id,
    });
  } catch (e) {
    console.error("order-status:", e);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
