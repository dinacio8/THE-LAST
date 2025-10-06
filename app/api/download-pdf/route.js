import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Méthode non autorisée");
  }

  const { id, type } = req.query;

  if (!id || !type) {
    return res.status(400).json({ error: "Paramètres manquants (id, type)" });
  }

  try {
    const column = type === "ticket" ? "ticket_pdf" : "invoice_pdf";
    const filename = type === "ticket" ? `ticket_${id}.pdf` : `facture_${id}.pdf`;

    const result = await pool.query(`SELECT ${column} FROM orders WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Fichier introuvable" });
    }

    const pdfBuffer = result.rows[0][column];
    if (!pdfBuffer) {
      return res.status(404).json({ error: "PDF vide" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ Erreur téléchargement PDF:", error);
    res.status(500).json({ error: "Erreur interne", details: error.message });
  }
}
