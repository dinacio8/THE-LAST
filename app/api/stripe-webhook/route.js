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
  page.drawImage(logoImage, { x: 50, y: height - 110, width: logoDims.width, height: logoDims.height });

  // Titre
  page.drawText("FACTURE", { x: 420, y: height - 70, size: 22, font, color: rgb(0.13, 0.6, 0.27) });

  // Infos entreprise
  page.drawText("No paint no game SARL", { x: 50, y: height - 140, size: 14, font });
  page.drawText("admin@gvapaintball.com", { x: 50, y: height - 155, size: 12, font });

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
  page.drawText("Merci pour votre commande et à bientôt chez GVA Paintball !", { x: 50, y: 40, size: 10, font });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString("base64");
}

/* -------------------------------------------------------
 🎫 BILLET A6 HORIZONTAL
------------------------------------------------------- */
/* -------------------------------------------------------
 🎫 BILLET A6 HORIZONTAL - VERSION PROPRE
------------------------------------------------------- */
async function generateTicketPDF({ firstName, lastName, type, sessionId }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 297]); // A6 horizontal
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  // --- Fond dégradé (vert -> jaune clair) ---
  const gradientSteps = 20;
  for (let i = 0; i < gradientSteps; i++) {
    const t = i / gradientSteps;
    const r = 0.13 + (1.0 - 0.13) * t;
    const g = 0.6 + (0.98 - 0.6) * t;
    const b = 0.27 * (1 - t);
    page.drawRectangle({
      x: 0,
      y: (height / gradientSteps) * i,
      width,
      height: height / gradientSteps,
      color: rgb(r, g, b),
    });
  }

  // --- Cadre gris foncé ---
  page.drawRectangle({
    x: 10,
    y: 10,
    width: width - 20,
    height: height - 20,
    borderWidth: 2,
    color: rgb(255, 255, 255),
  });

  // --- Logo centré en haut ---
  const logoUrl = "https://evenement.gvapaintball.com/terrain_GE_gvapaintball_01.png";
  const logoBytes = await fetch(logoUrl).then((r) => r.arrayBuffer());
  const logo = await pdfDoc.embedPng(logoBytes);
  const logoScale = 0.25;
  const logoDims = logo.scale(logoScale);
  const logoX = (width - logoDims.width) / 2;
  const logoY = height - logoDims.height - 25;
  page.drawImage(logo, {
    x: logoX,
    y: logoY,
    width: logoDims.width,
    height: logoDims.height,
  });

  // --- Texte sous le logo ---
  const textColor = rgb(0, 0, 0);
  const titleY = logoY - 25;

  page.drawText("THE LAST", {
    x: (width - font.widthOfTextAtSize("THE LAST", 18)) / 2,
    y: titleY,
    size: 18,
    font,
    color: textColor,
  });

  // --- Bloc infos participant ---
  page.drawText(`Nom : ${firstName} ${lastName}`, {
    x: 30,
    y: 120,
    size: 12,
    font,
    color: textColor,
  });
  page.drawText(`Type : ${type}`, { x: 30, y: 100, size: 12, font, color: textColor });
  page.drawText("Samedi 18 octobre 2025 — Dès 19h", { x: 30, y: 80, size: 12, font, color: textColor });
  page.drawText("Entrée valable pour 1 personne", { x: 30, y: 60, size: 12, font, color: textColor });

  // --- QR Code ---
  const qrData = await QRCode.toDataURL(`https://evenement.gvapaintball.com/success?session_id=${sessionId}`);
  const qrImage = await pdfDoc.embedPng(qrData);
  const qrSize = 80;
  page.drawImage(qrImage, {
    x: width - 120,
    y: 40,
    width: qrSize,
    height: qrSize,
  });

  // --- Numéro du billet ---
  page.drawText(`Billet n°: ${sessionId}`, {
    x: 30,
    y: 30,
    size: 10,
    font,
    color: textColor,
  });

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
  <title>Confirmation – The Last</title>
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
        from: "The last <evenement@gvapaintball.com>",
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
