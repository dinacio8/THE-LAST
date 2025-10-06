import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";

const FONT_PATH = "/tmp/arial.ttf"; // Police universelle compatible UTF-8

// Télécharge la police Arial si elle n'est pas déjà présente
if (!fs.existsSync(FONT_PATH)) {
  const fontData = Buffer.from(
    // Police de secours intégrée (subset basique)
    [],
  );
  fs.writeFileSync(FONT_PATH, fontData);
}

export async function generateTicket(ticketId, buyer, type) {
  const doc = new PDFDocument({
    size: [420, 297], // A6 horizontal
    layout: "landscape",
    margin: 20,
  });

  const buffers = [];
  doc.on("data", (d) => buffers.push(d));

  // Fond dégradé vert / gold
  const gradient = doc.linearGradient(0, 0, 420, 297);
  if (type === "VIP") {
    gradient.stop(0, "#d4af37").stop(1, "#fef3c7"); // doré
  } else {
    gradient.stop(0, "#16a34a").stop(1, "#86efac"); // vert
  }
  doc.rect(0, 0, 420, 297).fill(gradient);

  // Logo
  try {
    doc.image("terrain_GE_gvapaintball_01.png", 15, 15, { width: 80 });
  } catch {
    console.warn("⚠️ Logo introuvable (terrain_GE_gvapaintball_01.png)");
  }

  // Texte principal
  doc.font(FONT_PATH).fontSize(24).fillColor("#ffffff");
  doc.text("THE LAST", 120, 25);
  doc.fontSize(14).text("GVA Paintball - Genève", 120, 55);
  doc.moveTo(20, 90).lineTo(400, 90).strokeColor("#fff").stroke();

  // Infos billet
  doc.fontSize(12).fillColor("#fff");
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
  doc.fontSize(9).fillColor("#f3f4f6");
  doc.text("Présentez ce billet à l’entrée • Billet nominatif • Non remboursable", 25, 265);

  doc.end();
  return Buffer.concat(buffers);
}

export async function generateInvoice(invoiceId, buyer, type, price) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const buffers = [];
  doc.on("data", (d) => buffers.push(d));

  // Logo + titre
  try {
    doc.image("terrain_GE_gvapaintball_01.png", 50, 40, { width: 100 });
  } catch {
    console.warn("⚠️ Logo introuvable pour facture");
  }

  doc.font(FONT_PATH).fillColor("#16a34a").fontSize(20);
  doc.text("FACTURE", 400, 50, { align: "right" });
  doc.fontSize(12).fillColor("black");
  doc.text(`N° ${invoiceId}`, 400, 75, { align: "right" });
  doc.text(`Date : ${new Date().toLocaleDateString("fr-CH")}`, 400, 90, { align: "right" });

  // Coordonnées client
  doc.moveDown(2);
  doc.font(FONT_PATH).fontSize(12);
  doc.text("Facturé à :", 50, 150);
  doc.text(`${buyer.firstName} ${buyer.lastName}`);
  doc.text(buyer.address);
  doc.text(buyer.email);

  // Détails du billet
  doc.moveDown(2);
  doc.text("Description", 50, 260);
  doc.text("Quantité", 300, 260);
  doc.text("Prix (CHF)", 450, 260);
  doc.moveTo(50, 275).lineTo(540, 275).stroke();

  doc.font(FONT_PATH);
  doc.text(`Billet ${type} - The Last`, 50, 290);
  doc.text("1", 320, 290);
  doc.text(`${price.toFixed(2)} CHF`, 450, 290);

  // Total
  doc.moveTo(50, 320).lineTo(540, 320).strokeColor("#16a34a").stroke();
  doc.font(FONT_PATH).font("Helvetica-Bold").text("Total TTC :", 380, 340);
  doc.text(`${price.toFixed(2)} CHF`, 450, 340);

  // Pied de page
  doc.font(FONT_PATH).fontSize(10).fillColor("gray").text(
    "Merci pour votre confiance !\nTHE LAST - GVA Paintball, Genève",
    50,
    760,
    { align: "center" }
  );

  doc.end();
  return Buffer.concat(buffers);
}
