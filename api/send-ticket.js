import { Resend } from "resend";
import { generateTicketBuffer, generateInvoiceBuffer } from "../utils/pdfGenerator.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { type, firstName, lastName, email, address } = req.body;
      const price = type === "VIP" ? 15 : 5;

      const ticketId = `TICKET-${Date.now()}`;
      const invoiceId = `FAC-2025-10-${Date.now().toString().slice(-4)}`;
      const buyer = { firstName, lastName, email, address };

      console.log("📩 Génération billet + facture pour", email);

      // Générer les PDF
      const ticketBuffer = await generateTicketBuffer(ticketId, buyer, type);
      const invoiceBuffer = await generateInvoiceBuffer(invoiceId, buyer, type, price);

      // Envoi email via Resend
      await resend.emails.send({
        from: "Rave@GVAPaintball <confirmation@dias-lab.ch>",
        to: email,
        subject: `Ton billet pour THE LAST (${type})`,
        html: `
          <h2>Salut ${firstName},</h2>
          <p>Merci pour ton achat 🎉</p>
          <p>Voici ton billet <strong>${type}</strong> et ta facture pour <strong>THE LAST</strong>.</p>
          <p><strong>Date :</strong> 18 octobre 2025 — dès 19h</p>
          <p><strong>Lieu :</strong> GVA Paintball, Genève</p>
          <p>Présente ton billet à l’entrée pour accéder à l’événement.</p>
          <br/>
          <p>À bientôt 🔥</p>
        `,
        attachments: [
          {
            filename: `ticket-${ticketId}.pdf`,
            content: ticketBuffer.toString("base64"),
          },
          {
            filename: `invoice-${invoiceId}.pdf`,
            content: invoiceBuffer.toString("base64"),
          },
        ],
      });

      console.log("✅ Mail envoyé avec billet et facture à", email);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("❌ Erreur envoi billet/facture:", err);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Méthode non autorisée");
  }
}
