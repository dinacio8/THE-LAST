export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { type } = req.body || { type: "INDIVIDUEL" };
  const fakeSessionId = `FAKE-${Date.now()}`;

  return res.status(200).json({
    url: `/fake-checkout.html?session_id=${fakeSessionId}&type=${type}`
  });
}
