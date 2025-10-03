import PDFDocument from "pdfkit";
import QRCode from "qrcode";

/**
 * Générer un billet PDF
 */
export async function generateTicketBuffer(ticketId, buyer, type) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A6", layout: "portrait" });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Fond dégradé
      const gradient = doc.linearGradient(0, 0, 300, 0);
      if (type === "VIP") {
        gradient.stop(0, "#FFD700").stop(1, "#FFA500");
      } else {
        gradient.stop(0, "#22c55e").stop(1, "#16a34a");
      }
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(gradient);

      // Logo
      doc.image("terrain_GE_gvapaintball_01.png", 20, 20, { fit: [60, 60] });

      // Texte principal
      doc.fillColor("white").fontSize(16).text("THE LAST", 100, 30);
      doc.fontSize(10).text(type === "VIP" ? "Billet VIP" : "Billet INDIVIDUEL", 100, 50);

      // Infos acheteur
      doc.moveDown().fontSize(9);
      doc.text(`Nom : ${buyer.firstName} ${buyer.lastName}`);
      doc.text(`Email : ${buyer.email}`);
      doc.text(`ID Billet : ${ticketId}`);

      // QR code
      const qr = await QRCode.toDataURL(ticketId);
      const qrBase64 = qr.replace(/^data:image\/png;base64,/, "");
      const qrBuffer = Buffer.from(qrBase64, "base64");
      doc.image(qrBuffer, doc.page.width - 100, doc.page.height - 100, { fit: [80, 80] });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Générer une facture PDF
 */
export async function generateInvoiceBuffer(invoiceId, buyer, type, price) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4" });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // En-tête
      doc.image("terrain_GE_gvapaintball_01.png", 40, 40, { fit: [80, 80] });
      doc.fontSize(20).fillColor("black").text("FACTURE", 150, 50);
      doc.fontSize(10).text(`Facture N°: ${invoiceId}`, 400, 50);
      doc.text(`Date: ${new Date().toLocaleDateString("fr-CH")}`, 400, 65);

      // Infos client
      doc.moveDown().fontSize(12).text(`Facturé à :`, 50, 150);
      doc.fontSize(11).text(`${buyer.firstName} ${buyer.lastName}`);
      doc.text(`${buyer.email}`);

      // Tableau des lignes
      doc.moveDown().fontSize(12).text("Détails :", 50, 220);
      doc.moveDown();
      doc.text(`Billet ${type}`, 60, 250);
      doc.text(`${price.toFixed(2)} CHF`, 450, 250, { align: "right" });

      // Total TTC
      doc.moveDown().fontSize(12).fillColor("black").text("TOTAL TTC :", 350, 320);
      doc.font("Helvetica-Bold").text(`${price.toFixed(2)} CHF`, 450, 320, { align: "right" });

      // Pied de page
      doc.fontSize(9).fillColor("gray").text("Événement THE LAST @ GVA Paintball", 50, 750, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
