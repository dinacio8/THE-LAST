import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type"); // "ticket" | "invoice"

  if (!id || !["ticket", "invoice"].includes(type)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(`SELECT ticket_pdf, invoice_pdf, ticket_id, invoice_id
                                        FROM orders WHERE id=$1`, [id]);
    if (!rows.length) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

    const row = rows[0];
    const blob = type === "ticket" ? row.ticket_pdf : row.invoice_pdf;
    const filename = type === "ticket" ? `${row.ticket_id}.pdf` : `${row.invoice_id}.pdf`;

    return new NextResponse(Buffer.from(blob), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("download-pdf:", e);
    return NextResponse.json({ error: "Erreur téléchargement" }, { status: 500 });
  }
}
