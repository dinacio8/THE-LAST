import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Pool } from "pg";
import { generateTicket, generateInvoice } from "@/utils/pdfGenerator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// incrément atomique (counters.name = 'ticket' | 'invoice')
async function getNextCounter(name) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      INSERT INTO counters(name,value) VALUES($1,1)
      ON CONFLICT(name) DO UPDATE SET value = counters.value + 1
    `, [name]);
    const { rows } = await client.query(`SELECT value FROM counters WHERE name=$1`, [name]);
    await client.query("COMMIT");
    return rows[0].value;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function POST(req) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true }); // on ignore le reste
    }

    const session = event.data.object;
    const { firstName, lastName, address, type = "INDIVIDUEL" } = session.metadata || {};
    const email = session.customer_email;
    const price = 5;

    // numéros formatés YYYY-MM
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const ticketNum = await getNextCounter("ticket");
    const invoiceNum = await getNextCounter("invoice");
    const ticketId  = `TICKET-${prefix}-${String(ticketNum).padStart(4, "0")}`;
    const invoiceId = `FAC-${prefix}-${String(invoiceNum).padStart(4, "0")}`;

    const buyer = { firstName, lastName, email, address };

    // PDF en mémoire (Buffer)
    const ticketPDF  = await generateTicket(ticketId, buyer, "INDIVIDUEL");
    const invoicePDF = await generateInvoice(invoiceId, buyer, "INDIVIDUEL", price);

    // enregistre en base
    await pool.query(
      `INSERT INTO orders
        (stripe_session_id, ticket_id, invoice_id, first_name, last_name, email, address, price,
         ticket_pdf, invoice_pdf, status, type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PAID',$11)`,
      [session.id, ticketId, invoiceId, firstName, lastName, email, address, price, ticketPDF, invoicePDF, "INDIVIDUEL"]
    );

    // email + pièces jointes
    await resend.emails.send({
      from: "The Last <evenement@gvapaintball.com>",
      to: email,
      subject: "Ton billet THE LAST",
      html: `
        <p>Salut ${firstName},</p>
        <p>Merci pour ton achat ! Voici ton billet et ta facture pour <strong>THE LAST</strong>.</p>
        <p>Date : 18 octobre 2025 — dès 19h<br/>Lieu : GVA Paintball, Vernier</p>
        <p>Présente ton billet à l'entrée.</p>
      `,
      attachments: [
        { filename: `${ticketId}.pdf`, content: ticketPDF.toString("base64") },
        { filename: `${invoiceId}.pdf`, content: invoicePDF.toString("base64") },
      ],
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return new NextResponse("Webhook error", { status: 400 });
  }
}
