// api/tickets.js
const fs = require("fs");
const path = require("path");

module.exports = (req, res) => {
  const key = req.query.key;
  if (key !== process.env.ADMIN_KEY) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Accès refusé" }));
  }

  const ticketsPath = path.join("/tmp", "tickets.json");
  let tickets = [];
  if (fs.existsSync(ticketsPath)) {
    try {
      tickets = JSON.parse(fs.readFileSync(ticketsPath));
    } catch (e) {
      tickets = [];
    }
  }
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(tickets));
};
