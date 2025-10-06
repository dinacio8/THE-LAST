import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { Pool } from "pg";

// Connexion Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 📦 Génération du fichier Excel
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
        type,
        ticket_id,
        invoice_id,
        created_at
      FROM orders
      ORDER BY created_at DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Commandes");

    // En-têtes
    sheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Prénom", key: "first_name", width: 15 },
      { header: "Nom", key: "last_name", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Prix (CHF)", key: "price", width: 12 },
      { header: "Type", key: "type", width: 12 },
      { header: "Statut", key: "status", width: 12 },
      { header: "Ticket ID", key: "ticket_id", width: 18 },
      { header: "Facture ID", key: "invoice_id", width: 18 },
      { header: "Date", key: "created_at", width: 22 },
    ];

    // Style de l’en-tête
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16A34A" } };
      cell.alignment = { horizontal: "center" };
    });

    // Données
    result.rows.forEach((row) => {
      sheet.addRow({
        ...row,
        created_at: new Date(row.created_at).toLocaleString("fr-CH"),
      });
    });

    // Conversion en buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Réponse
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": "attachment; filename=commandes_the_last.xlsx",
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("❌ Erreur export Excel:", error);
    return NextResponse.json(
      { error: "Erreur export Excel", details: error.message },
      { status: 500 }
    );
  }
}
