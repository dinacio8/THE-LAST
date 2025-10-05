import Stripe from "stripe";
import { Resend } from "resend";
import fs from "fs";
import { buffer } from "micro";
import { generateTicket, generateInvoice } from "../../utils/pdfGenerator.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: {
    bodyParser: false, // Stripe exige un raw body
  },
};

export default async function handler(req, res) {
  if (req.method === "POST") {
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
      console.error("❌ Erreur Webhook:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ Paiement réussi → génération des fichiers
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const email = session.customer_email;
      const type = session.metadata.type;
      const firstName = session.metadata.firstName;
      const lastName = session.metadata.lastName;
      const address = session.metadata.address;

      const price = type === "VIP" ? 15 : 5;

      const ticketId = `TICKET-${Date.now()}`;
      const invoiceId = `FAC-2025-10-${Date.now().toString().slice(-4)}`;
      const buyer = { firstName, lastName, email, address };

      const ticketPath = await generateTicket(ticketId, buyer, type);
      const invoicePath = await generateInvoice(invoiceId, buyer, type, price);

      await resend.emails.send({
        from: "Rave@GVAPaintball <evenement@gvapaintball.com>",
        to: email,
        subject: `Ton billet pour THE LAST`,
        html: `<p>Salut ${firstName},</p>
               <p>Merci pour ton achat 🎉 Voici ton billet et ta facture pour <strong>THE LAST</strong>.</p>
               <p>Date : 18 octobre 2025 — dès 19h @ GVA Paintball</p>
               <p>Présente ton billet à l’entrée pour accéder à l’événement.</p>
               <p>À très vite 🔥</p>`,
        attachments: [
          {
            filename: `ticket-${ticketId}.pdf`,
            content: fs.readFileSync(ticketPath).toString("base64"),
          },
          {
            filename: `invoice-${invoiceId}.pdf`,
            content: fs.readFileSync(invoicePath).toString("base64"),
          },
        ],
      });
    }

    res.json({ received: true });
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Méthode non autorisée");
  }
}

