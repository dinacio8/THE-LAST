import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        first_name,
        last_name,
        email,
        price,
        status,
        created_at
      FROM orders
      ORDER BY created_at DESC
    `);

    return new Response(JSON.stringify(result.rows), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erreur récupération commandes:", error);
    return new Response(JSON.stringify({ error: "Erreur récupération commandes" }), { status: 500 });
  }
}
