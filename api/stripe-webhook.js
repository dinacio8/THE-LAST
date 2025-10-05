import Stripe from "stripe";
import { Resend } from "resend";
import { buffer } from "micro";
import { Pool } from "pg";
import { generateTicket, generateInvoice } from "../utils/pdfGenerator.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const config = {
  api: {
    bodyParser: false, // Stripe exige un raw body
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Méthode non autorisée");
  }

  let event;
  try {
    const sig = req.headers["stripe-signature"];
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Erreur vérification signature Stripe:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Paiement confirmé
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const { type, firstName, lastName, address } = session.metadata;
    const email = session.customer_email;
    const price = type === "VIP" ? 15 : 5;

    const ticketId = `TICKET-${Date.now()}`;
    const invoiceId = `FAC-2025-10-${Date.now().toString().slice(-4)}`;
    const buyer = { firstName, lastName, email, address };

    console.log(`🎟 Génération du billet + facture pour ${email}`);

    try {
      // Génération PDF (retourne un buffer)
      const ticketBuffer = await generateTicket(ticketId, buyer, type);
      const invoiceBuffer = await generateInvoice(invoiceId, buyer, type, price);

      // 💾 Enregistrement dans la base de données
      await pool.query(
        `INSERT INTO orders
         (stripe_session_id, ticket_id, invoice_id, type, first_name, last_name, email, address, price, ticket_pdf, invoice_pdf)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          session.id,
          ticketId,
          invoiceId,
          type,
          firstName,
          lastName,
          email,
          address,
          price,
          ticketBuffer,
          invoiceBuffer,
        ]
      );

      console.log(`✅ Données enregistrées dans la base pour ${email}`);

      // 📧 Envoi du mail via Resend
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

      console.log(`📩 Mail envoyé à ${email}`);
    } catch (err) {
      console.error("❌ Erreur lors de l'envoi du ticket/facture:", err);
    }
  }

  res.status(200).json({ received: true });
}
