// api/index.js
require('dotenv').config();
const express = require("express");
const path = require("path");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, ".."))); // sert les fichiers HTML

const dbFile = path.join(__dirname, "..", "tickets.json");

// --- Gestion tickets ---
function loadTickets() {
  if (!fs.existsSync(dbFile)) return [];
  return JSON.parse(fs.readFileSync(dbFile));
}
function saveTickets(tickets) {
  fs.writeFileSync(dbFile, JSON.stringify(tickets, null, 2));
}

// --- Création session (FAKE mode) ---
app.post("/create-checkout-session", (req, res) => {
  const fakeSessionId = `FAKE-${Date.now()}`;
  return res.json({ url: `/fake-checkout.html?session_id=${fakeSessionId}` });
});

// --- Routes succès / annulation ---
app.get("/success", (req, res) => res.sendFile(path.join(__dirname, "..", "success.html")));
app.get("/cancel", (req, res) => res.sendFile(path.join(__dirname, "..", "cancel.html")));

// --- Paiement simulé ---
app.post("/simulate-success", async (req, res) => {
  const sessionId = req.body.session_id || `FAKE-${Date.now()}`;
  const email = req.body.email || "test@example.com";

  console.log(`[SIMUL] Paiement reçu pour ${email} (${sessionId})`);

  try {
    const ticketPath = await generateTicket(sessionId, email);

    if (process.env.MAIL_USER && process.env.MAIL_PASS) {
      await sendTicket(email, ticketPath);
    }

    return res.redirect("/success");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Erreur lors de la génération du billet");
  }
});

// --- Génération billet PDF ---
async function generateTicket(sessionId, email) {
  const qr = await QRCode.toDataURL(sessionId);
  const filename = path.join("/tmp", `ticket-${sessionId}.pdf`);
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  const writeStream = fs.createWriteStream(filename);
  doc.pipe(writeStream);

  // Fond
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#111827");

  // Logo
  try {
    doc.image(path.join(__dirname, "..", "terrain_GE_gvapaintball_01.png"), doc.page.width - 140, 40, { fit: [100, 100] });
  } catch (e) {
    console.log("[WARN] Logo manquant pour PDF");
  }

  // Titre
  doc.fillColor("#22c55e").fontSize(26).text("🎶 Soirée Concert @ GVA Paintball", 60, 60);

  // Infos
  doc.fillColor("#e2e8f0").fontSize(14).text(`Billet électronique`, 60, 140);
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor("#cbd5e1").text(`Email: ${email}`);
  doc.text(`Transaction ID: ${sessionId}`);
  doc.text(`Date: Samedi 18 octobre 2025 • 20:00`);
  doc.text(`Lieu: Chemin des Coquelicots 29, 1214 Vernier`);

  // Encadré vert
  doc.rect(50, 220, doc.page.width - 100, 50).fill("#16a34a");
  doc.fillColor("white").fontSize(16).text("ADMIT ONE - Soirée Concert 🎶", 60, 235);

  // QR code
  const qrBuffer = Buffer.from(qr.split(",")[1], "base64");
  doc.image(qrBuffer, (doc.page.width - 180) / 2, 320, { fit: [180, 180] });

  doc.fillColor("#94a3b8").fontSize(10).text(
    "Présente ce billet à l’entrée. Un billet = une personne. Réservé aux 18 ans et plus.",
    60, 520, { align: "center", width: doc.page.width - 120 }
  );

  doc.end();
  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  let tickets = loadTickets();
  tickets.push({ id: sessionId, email, scanned: false });
  saveTickets(tickets);

  return filename;
}

// --- Envoi mail ---
async function sendTicket(email, ticketPath) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });
  await transporter.sendMail({
    from: `"Soirée Concert GVA" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Ton billet 🎫 Soirée Concert @ GVA Paintball",
    text: "Merci pour ta réservation ! Ton billet est en pièce jointe (PDF).",
    attachments: [{ filename: path.basename(ticketPath), path: ticketPath }]
  });
  console.log(`[MAIL] Billet envoyé à ${email}`);
}

// --- API Admin ---
app.get("/api/tickets", (req, res) => {
  const key = req.query.key;
  if (key !== process.env.ADMIN_KEY) return res.status(403).json({ error: "Accès refusé" });
  res.json(loadTickets());
});

module.exports = app; // 🔑 important pour Vercel
