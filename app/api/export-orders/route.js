import ExcelJS from "exceljs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id, first_name, last_name, email, price, status, created_at
      FROM orders
      ORDER BY created_at DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Commandes");

    sheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Nom", key: "first_name", width: 20 },
      { header: "Prénom", key: "last_name", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Prix (CHF)", key: "price", width: 15 },
      { header: "Statut", key: "status", width: 15 },
      { header: "Date", key: "created_at", width: 25 },
    ];

    result.rows.forEach((row) => sheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="commandes.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Erreur export Excel:", error);
    return new Response(JSON.stringify({ error: "Erreur export Excel" }), { status: 500 });
  }
}
