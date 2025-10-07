import { NextResponse } from "next/server";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // utile sur Vercel / Supabase
});

export async function GET() {
  console.log("📡 [ADMIN-ORDERS] Requête GET reçue");

  try {
    const client = await pool.connect();
    console.log("✅ Connexion DB OK");

    const query = `
      SELECT 
        id,
        order_number,
        session_id,
        first_name,
        last_name,
        email,
        type,
        price,
        status,
        created_at,
        used
      FROM orders
      ORDER BY created_at DESC
    `;

    const result = await client.query(query);
    console.log(`📦 ${result.rowCount} commandes récupérées`);

    client.release();

    if (result.rowCount === 0) {
      console.warn("⚠️ Aucun résultat renvoyé par la DB");
    }

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("❌ Erreur dans /api/admin-orders :", error);
    return NextResponse.json(
      { error: error.message || "Erreur API" },
      { status: 500 }
    );
  }
}
