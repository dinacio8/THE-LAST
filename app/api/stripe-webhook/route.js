import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { Pool } from "pg";
import { generateTicket, generateInvoice } from "@/utils/pdfGenerator.js";

// ⚙️ Initialisation
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// 🚀 Récupère et incrémente le compteur
async function getNextCounter(name) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      INSERT INTO counters (name, value)
      VALUES ($1, 1)
      ON CONFLICT (name) DO UPDATE SET value = counters.value + 1
    `, [name]);
    const { rows } = await client.query("SELECT value FROM counters WHERE name = $1", [name]);
    await client.query("COMMIT");
    return rows[0].value;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur compteur:", err);
    throw err;
  } finally {
    client.release();
  }
}

// 🧾 Le webhook Stripe (POST uniquement)
export async function POST(req) {
  let event;
  try {
    const sig = req.headers.get("stripe-signature");
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("❌ Erreur vérification signature Stripe:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // ✅ Paiement réussi
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { firstName, lastName, address, type } = session.metadata;
    const email = session.customer_email;

    try {
      // Incréments propres
      const ticketNum = await getNextCounter("ticket");
      const invoiceNum = await getNextCounter("invoice");
      const ticketId = `TICKET-2025-10-${String(ticketNum).padStart(4, "0")}`;
      const invoiceId = `FAC-2025-10-${String(invoiceNum).padStart(4, "0")}`;

      const buyer = { firstName, lastName, email, address };
      const price = 5.0; // prix unique

      // Génération PDF en mémoire
      const ticketPDF = await generateTicket(ticketId, buyer, "INDIVIDUEL");
      const invoicePDF = await generateInvoice(invoiceId, buyer, "INDIVIDUEL", price);

      // Enregistrement base de données
      await pool.query(`
        INSERT INTO orders (
          stripe_session_id,
          ticket_id,
          invoice_id,
          first_name,
          last_name,
          email,
          address,
          price,
          ticket_pdf,
          invoice_pdf,
          status,
          type
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PAID','INDIVIDUEL')
      `, [
        session.id,
        ticketId,
        invoiceId,
        firstName,
        lastName,
        email,
        address,
        price,
        ticketPDF,
        invoicePDF
      ]);

      console.log(`✅ Commande enregistrée et PDF générés pour ${email}`);

      // Envoi email
      await resend.emails.send({
        from: "The Last <evenement@gvapaintball.com>",
        to: email,
        subject: "🎫 Ton billet pour THE LAST",
        html: `
          <p>Salut ${firstName},</p>
          <p>Merci pour ton achat 🎉</p>
          <p>Voici ton billet et ta facture pour <strong>THE LAST</strong>.</p>
          <p><strong>Date :</strong> 18 octobre 2025 — dès 19h</p>
          <p><strong>Lieu :</strong> GVA Paintball, Chemin des Coquelicots 29, 1214 Vernier</p>
          <p>Présente ton billet à l’entrée pour accéder à la soirée.</p>
          <p>À très vite 🔥</p>
        `,
        attachments: [
          { filename: `${ticketId}.pdf`, content: ticketPDF.toString("base64") },
          { filename: `${invoiceId}.pdf`, content: invoicePDF.toString("base64") },
        ],
      });

      console.log(`📩 Email envoyé à ${email}`);
    } catch (error) {
      console.error("❌ Erreur traitement commande:", error);
    }
  }

  return NextResponse.json({ received: true });
}
