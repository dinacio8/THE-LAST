import { NextResponse } from "next/server";
import { Pool } from "pg";
import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT id, ticket_id, invoice_id, first_name, last_name, email, address,
             price, status, type, created_at
      FROM orders
      ORDER BY created_at DESC
    `);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Orders");

    ws.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "Ticket", key: "ticket_id", width: 22 },
      { header: "Facture", key: "invoice_id", width: 22 },
      { header: "Nom", key: "name", width: 28 },
      { header: "Email", key: "email", width: 28 },
      { header: "Adresse", key: "address", width: 42 },
      { header: "Type", key: "type", width: 12 },
      { header: "Prix", key: "price", width: 10 },
      { header: "Statut", key: "status", width: 12 },
      { header: "Date", key: "created_at", width: 20 },
    ];

    rows.forEach(r => {
      ws.addRow({
        id: r.id,
        ticket_id: r.ticket_id,
        invoice_id: r.invoice_id,
        name: `${r.first_name} ${r.last_name}`,
        email: r.email,
        address: r.address,
        type: r.type,
        price: r.price,
        status: r.status,
        created_at: new Date(r.created_at).toLocaleString("fr-CH"),
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="orders.xlsx"`,
      },
    });
  } catch (e) {
    console.error("export-orders:", e);
    return NextResponse.json({ error: "Erreur export" }, { status: 500 });
  }
}
