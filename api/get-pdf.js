import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  const { type, id, key } = req.query;

  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Accès refusé" });
  }

  const column = type === "ticket" ? "ticket_pdf" : "invoice_pdf";
  const fileName = type === "ticket" ? `billet-${id}.pdf` : `facture-${id}.pdf`;

  try {
    const result = await pool.query(
      `SELECT ${column} FROM orders WHERE ${type === "ticket" ? "ticket_id" : "invoice_id"} = $1 LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Fichier introuvable" });
    }

    const fileBuffer = result.rows[0][column];
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.send(fileBuffer);
  } catch (err) {
    console.error("Erreur lecture PDF:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
