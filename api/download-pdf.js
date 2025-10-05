import { pool } from "../lib/db.js";

export default async function handler(req, res) {
  const { id, type } = req.query;

  if (!id || !type) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  try {
    const column = type === "ticket" ? "ticket_pdf" : "invoice_pdf";
    const filename = type === "ticket" ? "billet.pdf" : "facture.pdf";

    const result = await pool.query(⁠ SELECT ${column} FROM orders WHERE id = $1 ⁠, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Fichier non trouvé" });
    }

    const buffer = result.rows[0][column];
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", ⁠ attachment; filename="${filename}" ⁠);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Erreur téléchargement PDF:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
}
