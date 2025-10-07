import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import pkg from "pg";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

const { Pool } = pkg;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/* -------------------------------------------------------
 🧾 FACTURE A4 PDF
------------------------------------------------------- */
async function generateInvoicePDF({ firstName, lastName, email, type, price, sessionId }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  // Logo
  const logoUrl = "https://evenement.gvapaintball.com/terrain_GE_gvapaintball_01.png";
  const logoBytes = await fetch(logoUrl).then((r) => r.arrayBuffer());
  const logoImage = await pdfDoc.embedPng(logoBytes);
  const logoDims = logoImage.scale(0.25);
  page.drawImage(logoImage, { x: 50, y: height - 100, width: logoDims.width, height: logoDims.height });

  // Titre
  page.drawText("FACTURE", { x: 420, y: height - 70, size: 22, font, color: rgb(0.13, 0.6, 0.27) });

  // Infos entreprise
  page.drawText("GVA Paintball", { x: 50, y: height - 140, size: 14, font });
  page.drawText("Chemin de la Verseuse 12", { x: 50, y: height - 155, size: 12, font });
  page.drawText("1217 Meyrin, Genève", { x: 50, y: height - 170, size: 12, font });
  page.drawText("contact@gvapaintball.com", { x: 50, y: height - 185, size: 12, font });

  // Client
  page.drawText("Facturé à :", { x: 50, y: height - 230, size: 12, font, color: rgb(0, 0, 0.5) });
  page.drawText(`${firstName} ${lastName}`, { x: 50, y: height - 245, size: 12, font });
  page.drawText(email, { x: 50, y: height - 260, size: 12, font });

  // Ligne
  page.drawLine({ start: { x: 50, y: height - 280 }, end: { x: 545, y: height - 280 }, thickness: 1, color: rgb(0.13, 0.6, 0.27) });

  // Détails
  page.drawText("DÉTAILS DE LA COMMANDE", { x: 50, y: height - 310, size: 14, font, color: rgb(0.13, 0.6, 0.27) });
  page.drawText(`Commande : ${sessionId}`, { x: 50, y: height - 330, size: 12, font });
  page.drawText(`Type de billet : ${type}`, { x: 50, y: height - 345, size: 12, font });
  page.drawText(`Quantité : 1`, { x: 50, y: height - 360, size: 12, font });
  page.drawText(`Prix unitaire : ${price} CHF`, { x: 50, y: height - 375, size: 12, font });

  // Total
  page.drawText("TOTAL TTC :", { x: 400, y: height - 420, size: 14, font });
  page.drawText(`${price} CHF`, { x: 490, y: height - 420, size: 14, font, color: rgb(0.13, 0.6, 0.27) });

  // Pied de page
  page.drawText("TVA non applicable – art. 21, al. 6, LTVA", { x: 50, y: 60, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText("Merci pour votre commande et à bientôt chez GVA Paintball !", { x: 50, y: 40, size: 10, font });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString("base64");
}

/* -------------------------------------------------------
 🎫 BILLET A6 HORIZONTAL
------------------------------------------------------- */
async function generateTicketPDF({ firstName, lastName, type, sessionId }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 297]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  // Fond gris clair + bordure
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.95, 0.95, 0.95) });
  page.drawRectangle({ x: 5, y: 5, width: width - 10, height: height - 10, borderWidth: 2, color: rgb(0.13, 0.6, 0.27) });

  // Logo
  const logoUrl = "https://evenement.gvapaintball.com/terrain_GE_gvapaintball_01.png";
  const logoBytes = await fetch(logoUrl).then((r) => r.arrayBuffer());
  const logo = await pdfDoc.embedPng(logoBytes);
  page.drawImage(logo, { x: 30, y: height - 100, width: 80, height: 80 });

  // Texte principal
  page.drawText("THE LAST @ GVA PAINTBALL", { x: 130, y: height - 60, size: 18, font, color: rgb(0.13, 0.6, 0.27) });
  page.drawText("Samedi 18 octobre 2025 — Dès 19h", { x: 130, y: height - 80, size: 10, font });
  page.drawText(`Nom: ${firstName} ${lastName}`, { x: 30, y: 130, size: 12, font });
  page.drawText(`Type: ${type}`, { x: 30, y: 110, size: 12, font });
  page.drawText("Lieu: GVA Paintball, Meyrin (GE)", { x: 30, y: 90, size: 12, font });
  page.drawText("Entrée valable pour 1 personne", { x: 30, y: 70, size: 12, font });

  // QR Code
  const qrData = await QRCode.toDataURL(`https://evenement.gvapaintball.com/success?session_id=${sessionId}`);
  const qrImage = await pdfDoc.embedPng(qrData);
  page.drawImage(qrImage, { x: width - 130, y: 50, width: 80, height: 80 });

  page.drawText(`Billet n°: ${sessionId}`, { x: 30, y: 40, size: 10, font, color: rgb(0.4, 0.4, 0.4) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString("base64");
}

/* -------------------------------------------------------
 ✉️ TEMPLATE EMAIL (le tien)
------------------------------------------------------- */
const emailTemplate = (data) => `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Confirmation – The Last @ GVA Paintball</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f6f6f6;color:#333;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:30px 15px;">
        <table width="600" style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#22c55e,#facc15);padding:25px;">
              <img src="https://evenement.gvapaintball.com/terrain_GE_gvapaintball_01.png" alt="GVA Paintball" width="100" style="display:block;border:none;margin-bottom:10px;">
              <h1 style="margin:0;font-size:24px;color:#fff;font-weight:bold;">The Last @ GVA Paintball</h1>
              <p style="color:#fff;margin:10px 0 0 0;font-size:16px;">Samedi 18 octobre 2025</p>
            </td>
          </tr>

          <tr>
            <td style="padding:30px;">
              <h2 style="color:#22c55e;margin-top:0;">🎉 Paiement confirmé !</h2>
              <p>Bonjour <strong>${data.firstName} ${data.lastName}</strong>,</p>
              <p>Merci pour ta commande ! Ton billet est bien enregistré pour <b>The Last</b>.</p>
              
              <table cellspacing="0" cellpadding="6" border="0" width="100%" style="background:#fafafa;border:1px solid #eee;border-radius:8px;margin:20px 0;">
                <tr><td style="font-weight:bold;width:40%;">Type de billet</td><td>${data.type}</td></tr>
                <tr><td style="font-weight:bold;">Montant</td><td>${data.price} CHF</td></tr>
                <tr><td style="font-weight:bold;">Email</td><td>${data.email}</td></tr>
                <tr><td style="font-weight:bold;">N° de commande</td><td>${data.sessionId}</td></tr>
              </table>

              <p>Tu trouveras ci-joint ton <strong>billet PDF</strong> et ta <strong>facture</strong>.</p>
              <p>Présente ton billet à l’entrée le <b>samedi 18 octobre 2025 dès 19h</b>.</p>

              <div style="text-align:center;margin-top:30px;">
                <a href="https://evenement.gvapaintball.com/success?session_id=${data.sessionId}" 
                   style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">
                   Voir ma commande
                </a>
              </div>

              <hr style="margin:40px 0;border:none;border-top:1px solid #eee;">
              <p style="font-size:13px;color:#777;">
                Pour toute question, réponds simplement à ce message ou contacte-nous sur Instagram 
                <a href="https://www.instagram.com/gvapaintball" style="color:#22c55e;text-decoration:none;">@gvapaintball</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="background:#f9fafb;padding:20px;font-size:12px;color:#999;">
              © 2025 GVA Paintball — Tous droits réservés<br>
              <a href="https://evenement.gvapaintball.com" style="color:#22c55e;text-decoration:none;">evenement.gvapaintball.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/* -------------------------------------------------------
 💳 WEBHOOK STRIPE
------------------------------------------------------- */
export async function POST(req) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const email = session.customer_details?.email;
      const firstName = session.metadata?.firstName || "Client";
      const lastName = session.metadata?.lastName || "";
      const type = session.metadata?.type || "INDIVIDUEL";
      const price = (session.amount_total / 100).toFixed(2);
      const sessionId = session.id;

      console.log("✅ Paiement confirmé :", sessionId);

      const client = await pool.connect();
      await client.query(
        `INSERT INTO orders (session_id, first_name, last_name, email, type, price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [sessionId, firstName, lastName, email, type, price]
      );
      client.release();

      const ticketPdf = await generateTicketPDF({ firstName, lastName, type, sessionId });
      const invoicePdf = await generateInvoicePDF({ firstName, lastName, email, type, price, sessionId });

      await resend.emails.send({
        from: "GVA Paintball <noreply@evenement.gvapaintball.com>",
        to: email,
        subject: "Ton billet et ta facture – The Last @ GVA Paintball",
        html: emailTemplate({ firstName, lastName, type, price, email, sessionId }),
        attachments: [
          { filename: "billet.pdf", content: ticketPdf, encoding: "base64" },
          { filename: "facture.pdf", content: invoicePdf, encoding: "base64" },
        ],
      });

      console.log(`Mail envoyé à ${email}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Erreur globale du webhook :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
