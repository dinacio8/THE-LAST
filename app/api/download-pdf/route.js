import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");

  if (!id || !type) {
    return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400 });
  }

  try {
    const column = type === "ticket" ? "ticket_pdf" : "invoice_pdf";
    const result = await pool.query(
      `SELECT ${column} FROM orders WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Fichier introuvable" }), { status: 404 });
    }

    const pdfBuffer = result.rows[0][column];
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=${id}_${type}.pdf`,
      },
    });
  } catch (error) {
    console.error("Erreur téléchargement PDF:", error);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 });
  }
}
