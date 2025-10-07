import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id"); // l'id = session_id Stripe

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID manquant" }),
        { status: 400 }
      );
    }

    // 🔍 On cherche le numéro de commande lié à cette session
    const { rows } = await pool.query(
      `SELECT order_number FROM orders WHERE session_id = $1 LIMIT 1`,
      [sessionId]
    );

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Commande introuvable" }),
        { status: 404 }
      );
    }

    // ✅ Renvoie l'ordre correspondant
    return new Response(JSON.stringify(rows[0]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("🔥 Erreur dans get-order-by-session :", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
