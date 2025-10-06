import { NextResponse } from "next/server";
import { Pool } from "pg";

// 🔧 Connexion à Neon (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 📦 Récupération du statut d'une commande Stripe
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get("session_id");

  if (!session_id) {
    return NextResponse.json({ error: "Paramètre session_id manquant" }, { status: 400 });
  }

  try {
    // Recherche de la commande liée à la session Stripe
    const result = await pool.query(
      `SELECT
         first_name,
         last_name,
         email,
         price,
         status,
         ticket_id,
         invoice_id,
         created_at
       FROM orders
       WHERE stripe_session_id = $1`,
      [session_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    const order = result.rows[0];

    return NextResponse.json({
      success: true,
      firstName: order.first_name,
      lastName: order.last_name,
      email: order.email,
      price: order.price,
      status: order.status,
      ticket: order.ticket_id,
      invoice: order.invoice_id,
      createdAt: order.created_at,
    });
  } catch (error) {
    console.error("❌ Erreur récupération commande:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur", details: error.message },
      { status: 500 }
    );
  }
}
