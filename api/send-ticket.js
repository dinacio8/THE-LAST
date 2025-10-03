import { query } from "../../utils/db.js";
import { generateTicketBuffer, generateInvoiceBuffer } from "../../utils/pdfGenerator.js";
import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { buyer, type } = req.body;
    const price = type === "VIP" ? 15 : 5;

    // Générer un ticketId unique basé sur l'incrémentation DB
    const lastTicket = await query("SELECT MAX(id) as lastId FROM tickets");
    const ticketId = `T-${new Date().getFullYear()}-${String((lastTicket[0].lastId || 0) + 1).padStart(4, "0")}`;

    await query(
      "INSERT INTO tickets (ticket_id, buyer_name, buyer_email, type, price) VALUES (?, ?, ?, ?, ?)",
      [ticketId, `${buyer.firstName} ${buyer.lastName}`, buyer.email, type, price]
    );

    // Générer un invoiceId unique basé sur l'incrémentation DB
    const lastInvoice = await query("SELECT MAX(id) as lastId FROM factures");
    const invoiceId = `FAC-${new Date().getFullYear()}-${String((lastInvoice[0].lastId || 0) + 1).padStart(4, "0")}`;

    await query(
      "INSERT INTO factures (invoice_id, ticket_id, buyer_name, buyer_email, total) VALUES (?, ?, ?, ?, ?)",
      [invoiceId, ticketId, `${buyer.firstName} ${buyer.lastName}`, buyer.email, price]
    );

    // Générer PDF billet + facture
    const ticketBuffer = await generateTicketBuffer(ticketId, buyer, type);
    const invoiceBuffer = await generateInvoiceBuffer(invoiceId, buyer, type, price);

    // Envoi du mail
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Rave@GVAPaintball <confirmation@dias-lab.ch>",
      to: buyer.email,
      subject: `Confirmation - THE LAST @ GVA Paintball`,
      html: `<p>Merci ${buyer.firstName},</p>
             <p>Voici ton billet et ta facture pour <b>THE LAST</b> 🎉</p>
             <p>À présenter à l'entrée.</p>`,
      attachments: [
        { filename: `billet-${ticketId}.pdf`, content: ticketBuffer.toString("base64"), type: "application/pdf" },
        { filename: `facture-${invoiceId}.pdf`, content: invoiceBuffer.toString("base64"), type: "application/pdf" }
      ]
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erreur API:", err);
    return res.status(500).json({ error: err.message });
  }
}
