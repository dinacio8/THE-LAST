import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Paramètre session_id manquant" }), { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT first_name, last_name, email, type, price, status, created_at 
       FROM orders WHERE stripe_session_id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Commande non trouvée" }), { status: 404 });
    }

    const order = result.rows[0];
    return new Response(
      JSON.stringify({
        status: order.status,
        firstName: order.first_name,
        lastName: order.last_name,
        email: order.email,
        type: order.type,
        price: order.price,
        createdAt: order.created_at,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erreur lecture commande:", err);
    return new Response(JSON.stringify({ error: "Erreur interne", details: err.message }), {
      status: 500,
    });
  }
}
