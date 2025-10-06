import Stripe from "stripe";
import { Resend } from "resend";
import { buffer } from "micro";
import { generateTicket, generateInvoice } from "../utils/pdfGenerator.js";
import pkg from "pg";
const { Pool } = pkg;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const config = {
  api: {
    bodyParser: false,
  },
};

// Fonction pour récupérer et incrémenter les compteurs
async function getNextCounter(type) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      "UPDATE counters SET value = value + 1 WHERE name = $1 RETURNING value",
      [type]
    );
    if (res.rows.length === 0) {
      await client.query("INSERT INTO counters (name, value) VALUES ($1, 1)", [type]);
      return 1;
    }
    return res.rows[0].value;
  } finally {
    client.release();
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Méthode non autorisée");
  }

  let event;
  try {
    const sig = req.headers["stripe-signature"];
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("❌ Erreur vérification signature Stripe:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const firstName = session.metadata?.firstName || "Client";
    const lastName = session.metadata?.lastName || "";
    const address = session.metadata?.address || "Adresse non spécifiée";
    const type = session.metadata?.type || "INDIVIDUEL";
    const email = session.customer_email;
    const price = type === "VIP" ? 15 : 5;

    try {
      const ticketNum = await getNextCounter("ticket");
      const invoiceNum = await getNextCounter("invoice");
      const ticketId = `TICKET-2025-10-${String(ticketNum).padStart(4, "0")}`;
      const invoiceId = `FAC-2025-10-${String(invoiceNum).padStart(4, "0")}`;

      const buyer = { firstName, lastName, email, address };

      // Génération PDF (buffers)
      const ticketBuffer = await generateTicket(ticketId, buyer, type);
      const invoiceBuffer = await generateInvoice(invoiceId, buyer, type, price);

      // Enregistrement base Neon
      await pool.query(
        `INSERT INTO orders 
          (stripe_session_id, ticket_id, invoice_id, first_name, last_name, email, address, price, ticket_pdf, invoice_pdf, created_at, status, type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),'PAID',$11)`,
        [
          session.id,
          ticketId,
          invoiceId,
          firstName,
          lastName,
          email,
          address,
          price,
          ticketBuffer,
          invoiceBuffer,
          type,
        ]
      );

      console.log(`✅ Commande enregistrée pour ${email}`);

      // Envoi du mail
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
          {
            filename: `billet-${ticketId}.pdf`,
            content: ticketBuffer.toString("base64"),
          },
          {
            filename: `facture-${invoiceId}.pdf`,
            content: invoiceBuffer.toString("base64"),
          },
        ],
      });

      console.log(`✅ Mail envoyé à ${email}`);
    } catch (err) {
      console.error("❌ Erreur traitement commande:", err);
    }
  }

  res.status(200).json({ received: true });
}
