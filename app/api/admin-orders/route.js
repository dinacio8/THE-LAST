import { NextResponse } from "next/server";
import pkg from "pg";
const { Pool } = pkg;

// Connexion à ta base PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const client = await pool.connect();

    // 🔹 On récupère toutes les commandes, triées par date
    const result = await client.query(`
      SELECT 
        id,
        session_id,
        first_name,
        last_name,
        email,
        type,
        price,
        status,
        created_at
      FROM orders
      ORDER BY created_at DESC
    `);

    client.release();

    // Renvoie JSON des commandes
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("❌ Erreur dans /api/admin-orders :", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes" },
      { status: 500 }
    );
  }
}
