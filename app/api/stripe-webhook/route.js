import Stripe from "stripe";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Pool } from "pg";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 🔧 Fonction utilitaire pour charger le logo depuis /public
async function loadLogo(pdfDoc) {
  try {
    const logoUrl = "https://evenement.gvapaintball.com/terrain_GE_gvapaintball_01.png";
    const res = await fetch(logoUrl);
    const logoBytes = await res.arrayBuffer();
    return await pdfDoc.embedPng(logoBytes);
  } catch (err) {
    console.error("⚠️ Erreur lors du chargement du logo :", err);
    return null;
  }
}

// --- BILLET PDF ---
async function generateTicketPDF(session, qrDataUrl) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { height } = page.getSize();

  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const logo = await loadLogo(pdfDoc);

  if (logo) {
    const logoDims = logo.scale(0.25);
    page.drawImage(logo, {
      x: 50,
      y: height - 100,
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  page.drawText("THE LAST @ GVA Paintball", {
    x: 120,
    y: height - 70,
    size: 20,
    font: titleFont,
    color: rgb(0.13, 0.77, 0.37),
  });

  const details = [
    `Nom : ${session.metadata.firstName} ${session.metadata.lastName}`,
    `Email : ${session.customer_details.email}`,
    `Billet : ${session.metadata.type}`,
    `Montant payé : ${session.amount_total / 100} CHF`,
    `Date : Samedi 18 octobre 2025`,
    `Lieu : GVA Paintball, Genève`,
  ];

  let y = height - 150;
  for (const line of details) {
    page.drawText(line, { x: 80, y, size: 13, font: textFont, color: rgb(0, 0, 0) });
    y -= 20;
  }

  const qrImageBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  const qrDims = qrImage.scale(0.4);
  page.drawImage(qrImage, {
    x: 220,
    y: height - 400,
    width: qrDims.width,
    height: qrDims.height,
  });

  page.drawText("Présente ce billet à l’entrée.", {
    x: 190,
    y: height - 440,
    size: 12,
    font: textFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// --- FACTURE PDF ---
async function generateInvoicePDF(session) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { height } = page.getSize();

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const logo = await loadLogo(pdfDoc);

  if (logo) {
    const logoDims = logo.scale(0.25);
    page.drawImage(logo, {
      x: 50,
      y: height - 100,
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  page.drawText("GVA Paintball", {
    x: 120,
    y: height - 70,
    size: 18,
    font: bold,
    color: rgb(0.13, 0.77, 0.37),
  });

  page.drawText("FACTURE", { x: 450, y: height - 70, size: 18, font: bold });
  page.drawText(`N° ${session.id}`, { x: 450, y: height - 90, size: 10, font: regular });

  let y = height - 150;
  page.drawText("Facturé à :", { x: 50, y, size: 12, font: bold });
  y -= 20;
  page.drawText(`${session.metadata.firstName} ${session.metadata.lastName}`, { x: 50, y, size: 12, font: regular });
  y -= 15;
  page.drawText(`${session.customer_details.email}`, { x: 50, y, size: 12, font: regular });

  y -= 40;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.13, 0.77, 0.37) });
  y -= 30;

  const headers = ["Description", "Quantité", "Prix unitaire", "Total"];
  const values = [
    ["Billet The Last @ GVA Paintball", "1", `${(session.amount_total / 100).toFixed(2)} CHF`, `${(session.amount_total / 100).toFixed(2)} CHF`],
  ];

  const xPos = [50, 300, 400, 500];
  headers.forEach((h, i) => page.drawText(h, { x: xPos[i], y, size: 12, font: bold }));
  y -= 20;
  values[0].forEach((v, i) => page.drawText(v, { x: xPos[i], y, size: 12, font: regular }));

  y -= 40;
  const montant = session.amount_total / 100;
  const tva = (montant * 0.077).toFixed(2);
  const totalTTC = (montant + parseFloat(tva)).toFixed(2);

  page.drawText(`Sous-total : ${montant.toFixed(2)} CHF`, { x: 400, y, size: 12, font: regular });
  y -= 15;
  page.drawText(`TVA (7.7%) : ${tva} CHF`, { x: 400, y, size: 12, font: regular });
  y -= 15;
  page.drawText(`Total TTC : ${totalTTC} CHF`, { x: 400, y, size: 12, font: bold });

  y -= 50;
  page.drawText("Merci pour votre achat et votre confiance.", {
    x: 50,
    y,
    size: 12,
    font: bold,
    color: rgb(0.13, 0.77, 0.37),
  });
  y -= 15;
  page.drawText("Paiement confirmé via Stripe.", { x: 50, y, size: 10, font: regular });
  page.drawText("GVA Paintball — TVA CHE-123.456.789", {
    x: 50,
    y: 30,
    size: 8,
    font: regular,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// --- WEBHOOK STRIPE ---
export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("⚠️ Signature Stripe invalide :", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("✅ Paiement confirmé :", session.id);

    try {
      const qrDataUrl = await QRCode.toDataURL(`https://evenement.gvapaintball.com/success?session_id=${session.id}`);
      const ticketPDF = await generateTicketPDF(session, qrDataUrl);
      const invoicePDF = await generateInvoicePDF(session);

      await pool.query(
        `INSERT INTO orders (session_id, first_name, last_name, email, type, amount)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (session_id) DO NOTHING;`,
        [
          session.id,
          session.metadata.firstName,
          session.metadata.lastName,
          session.customer_details?.email,
          session.metadata.type,
          session.amount_total / 100,
        ]
      );

      await resend.emails.send({
        from: "GVA Paintball <noreply@evenement.gvapaintball.com>",
        to: session.customer_details.email,
        subject: "Ton billet et ta facture - The Last @ GVA Paintball",
        html: `
          <h2>Merci pour ton achat !</h2>
          <p>Bonjour ${session.metadata.firstName},</p>
          <p>Voici ton billet et ta facture pour <b>The Last</b>.</p>
          <ul>
            <li><b>Type :</b> ${session.metadata.type}</li>
            <li><b>Montant :</b> ${(session.amount_total / 100).toFixed(2)} CHF</li>
            <li><b>Date :</b> Samedi 18 octobre 2025</li>
            <li><b>Lieu :</b> GVA Paintball, Genève</li>
          </ul>
          <p>Présente ton billet à l'entrée. Ta facture est en pièce jointe.</p>
          <br>
          <p>À très vite pour une nuit inoubliable !</p>
        `,
        attachments: [
          { filename: `Billet_${session.metadata.lastName}.pdf`, content: ticketPDF.toString("base64") },
          { filename: `Facture_${session.metadata.lastName}.pdf`, content: invoicePDF.toString("base64") },
        ],
      });

      console.log("📧 Mail billet + facture envoyé à", session.customer_details.email);
    } catch (err) {
      console.error("🔥 Erreur lors du traitement :", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
