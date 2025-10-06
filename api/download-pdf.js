import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  try {
    const { id, type } = req.query;

    if (!id || !type) {
      return res.status(400).json({ error: "Paramètres manquants : id ou type." });
    }

    // On vérifie que le type est valide
    if (!["ticket", "invoice"].includes(type)) {
      return res.status(400).json({ error: "Type invalide, doit être 'ticket' ou 'invoice'." });
    }

    // 🔍 Récupération du PDF depuis la base
    const query = `
      SELECT ${type === "ticket" ? "ticket_pdf" : "invoice_pdf"} AS pdf_data,
             ${type === "ticket" ? "ticket_id" : "invoice_id"} AS file_name
      FROM orders
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Aucune commande trouvée avec cet ID." });
    }

    const pdfData = rows[0].pdf_data;
    const fileName = rows[0].file_name || `${type}-${id}`;

    if (!pdfData) {
      return res.status(404).json({ error: "PDF introuvable ou vide dans la base de données." });
    }

    // 🔽 Envoi du PDF au navigateur
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}.pdf"`);
    res.send(Buffer.from(pdfData, "base64"));
  } catch (err) {
    console.error("❌ Erreur download-pdf:", err);
    res.status(500).json({ error: "Erreur interne du serveur", details: err.message });
  }
}
