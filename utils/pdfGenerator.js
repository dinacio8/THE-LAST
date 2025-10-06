import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export async function generateTicket(ticketId, buyer, type) {
  const doc = new PDFDocument({ size: [420, 297], layout: "landscape", margin: 20 });
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  // Dégradé vert
  const gradient = doc.linearGradient(0, 0, 420, 297);
  gradient.stop(0, "#16a34a").stop(1, "#86efac");
  doc.rect(0, 0, 420, 297).fill(gradient);

  // Logo
  try {
    doc.image("terrain_GE_gvapaintball_01.png", 15, 15, { width: 80 });
  } catch {
    console.warn("Logo introuvable — vérifie son chemin à la racine.");
  }

  // Texte principal
  doc.fillColor("white").fontSize(24).font("Helvetica-Bold");
  doc.text("THE LAST - Entrée Officielle", 120, 25);
  doc.fontSize(16).text("GVA Paintball - Genève", 120, 55);
  doc.moveTo(20, 90).lineTo(400, 90).strokeColor("white").stroke();

  // Infos billet
  doc.fontSize(14).font("Helvetica");
  doc.text(`Titulaire : ${buyer.firstName} ${buyer.lastName}`, 25, 110);
  doc.text(`Type : ${type}`, 25, 130);
  doc.text(`Date : 18 octobre 2025 - 19h00`, 25, 150);
  doc.text(`Adresse : Chemin des Coquelicots 29, 1214 Vernier`, 25, 170);
  doc.text(`ID Billet : ${ticketId}`, 25, 190);

  // QR code
  const qrData = `https://evenement.gvapaintball.com/verify?ticket=${ticketId}`;
  const qrImage = await QRCode.toDataURL(qrData);
  const qrBase64 = qrImage.split(",")[1];
  const qrBuffer = Buffer.from(qrBase64, "base64");
  doc.image(qrBuffer, 320, 110, { width: 80, height: 80 });

  // Pied de page
  doc.fontSize(10).fillColor("white").text("Présentez ce billet à l'entrée • Non remboursable", 25, 265);

  doc.end();
  return Buffer.concat(buffers);
}

export async function generateInvoice(invoiceId, buyer, type, price) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  // Logo + titre
  try {
    doc.image("terrain_GE_gvapaintball_01.png", 50, 40, { width: 100 });
  } catch {
    console.warn("Logo introuvable pour facture.");
  }

  doc.fontSize(20).fillColor("#16a34a").font("Helvetica-Bold");
  doc.text("FACTURE", 400, 50, { align: "right" });
  doc.fontSize(12).fillColor("black");
  doc.text(`N° ${invoiceId}`, 400, 75, { align: "right" });
  doc.text(`Date : ${new Date().toLocaleDateString("fr-CH")}`, 400, 90, { align: "right" });

  // Client
  doc.moveDown(2);
  doc.fontSize(12).text(`Facturé à :`, 50, 150);
  doc.text(`${buyer.firstName} ${buyer.lastName}`);
  doc.text(buyer.address);
  doc.text(buyer.email);

  // Détails achat
  doc.moveDown(2);
  doc.text("Description", 50, 260);
  doc.text("Quantité", 300, 260);
  doc.text("Prix (CHF)", 450, 260);
  doc.moveTo(50, 275).lineTo(540, 275).stroke();

  doc.font("Helvetica");
  doc.text(`Billet ${type} - The Last`, 50, 290);
  doc.text("1", 320, 290);
  doc.text(`${price.toFixed(2)} CHF`, 450, 290);

  // Total
  doc.moveTo(50, 320).lineTo(540, 320).strokeColor("#16a34a").stroke();
  doc.font("Helvetica-Bold").text("Total TTC :", 380, 340);
  doc.text(`${price.toFixed(2)} CHF`, 450, 340);

  // Pied de page
  doc.fontSize(10).fillColor("gray").text(
    "Merci pour votre confiance !\nTHE LAST - GVA Paintball, Genève",
    50,
    760,
    { align: "center" }
  );

  doc.end();
  return Buffer.concat(buffers);
}
