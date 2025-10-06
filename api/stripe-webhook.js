import Stripe from "stripe";
import { Resend } from "resend";
import { buffer } from "micro";
import pkg from "pg";
import PDFDocument from "pdfkit";
import getStream from "get-stream";

const { Pool } = pkg;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const config = {
  api: {
    bodyParser: false, // Stripe exige un raw body
  },
};

// 🔧 Fonction utilitaire pour créer un PDF mémoire
async function createPDF(type, buyer, price, id) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  let stream = doc.pipe(getStream.buffer());

  // En-tête
  doc.fontSize(22).fillColor("#16a34a").text(type === "ticket" ? "🎟 Billet THE LAST" : "🧾 Facture THE LAST");
  doc.moveDown();
  doc.fillColor("black").fontSize(14);
  doc.text(`Nom : ${buyer.firstName} ${buyer.lastName}`);
  doc.text(`Email : ${buyer.email}`);
  doc.text(`Adresse : ${buyer.address}`);
  doc.moveDown();
  doc.text(`Identifiant : ${id}`);
  doc.moveDown();

  if (type === "ticket") {
    doc.text("Entrée valable pour l’événement THE LAST", { underline: true });
    doc.text("Date : 18 octobre 2025 - 19h00");
    doc.text("Lieu : GVA Paintball, Chemin des Coquelicots 29, 1214 Vernier");
  } else {
    doc.text("Facture pour achat de billet THE LAST", { underline: true });
    doc.text(`Montant total : ${price.toFixed(2)} CHF (TTC)`);
    doc.text(`Mode de paiement : Stripe`);
  }

  doc.end();
  return await stream;
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
    console.error("❌ Erreur Webhook Stripe:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { type, firstName, lastName, address } = session.metadata;
    const email = session.customer_email;
    const price = type === "VIP" ? 15 : 5;

    try {
      // 🔢 Génération d’un numéro incrémental
      const { rows: counterRows } = await pool.query(
        "UPDATE counters SET value = value + 1 WHERE name = 'order' RETURNING value"
      );
      const nextId = counterRows[0]?.value || 1;

      const ticketId = `TICKET-2025-10-${String(nextId).padStart(4, "0")}`;
      const invoiceId = `FAC-2025-10-${String(nextId).padStart(4, "0")}`;
      const buyer = { firstName, lastName, email, address };

      console.log(`🎟 Génération du billet + facture pour ${email} (#${nextId})`);

      // ✅ Génération des PDF complets en mémoire
      const ticketBuffer = await createPDF("ticket", buyer, price, ticketId);
      const invoiceBuffer = await createPDF("invoice", buyer, price, invoiceId);

      // ✅ Enregistrement dans Neon
      await pool.query(
        `INSERT INTO orders (stripe_session_id, ticket_id, invoice_id, first_name, last_name, email, address, price, ticket_pdf, invoice_pdf, status, type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          session.id,
          ticketId,
          invoiceId,
          firstName,
          lastName,
          email,
          address,
          price,
          ticketBuffer.toString("base64"),
          invoiceBuffer.toString("base64"),
          "PAID",
          type,
        ]
      );

      // ✅ Envoi du mail via Resend
      await resend.emails.send({
        from: "The Last <evenement@gvapaintball.com>",
        to: email,
        subject: "🎫 Ton billet pour THE LAST",
        html: `
          <p>Salut ${firstName},</p>
          <p>Merci pour ton achat 🎉 Voici ton billet et ta facture pour <strong>THE LAST</strong>.</p>
          <p>Date : 18 octobre 2025 — dès 19h @ GVA Paintball</p>
          <p>Présente ton billet à l’entrée pour accéder à l’événement.</p>
          <p>À très vite 🔥</p>
        `,
        attachments: [
          { filename: `${ticketId}.pdf`, content: ticketBuffer.toString("base64") },
          { filename: `${invoiceId}.pdf`, content: invoiceBuffer.toString("base64") },
        ],
      });

      console.log(`✅ Mail envoyé à ${email}`);
    } catch (err) {
      console.error("❌ Erreur traitement commande:", err);
    }
  }

  res.json({ received: true });
}
