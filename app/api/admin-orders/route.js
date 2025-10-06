import { Pool } from "pg";
import { NextResponse } from "next/server";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 📋 Récupère toutes les commandes pour la page Admin
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

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("❌ Erreur récupération commandes:", error);
    return NextResponse.json(
      {
        error: "Erreur récupération commandes",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
