"use client";

import { useEffect, useState } from "react";

export const metadata = {
  title: "Paiement réussi - The Last",
  description: "Paiement confirmé pour ton billet à The Last @ GVA Paintball.",
};

export default function SuccessPage() {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStatus() {
      const params = new URLSearchParams(window.location.search);
      const session_id = params.get("session_id");

      if (!session_id) {
        setError("❌ Impossible de retrouver les infos de commande.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/order-status?session_id=${session_id}`);
        const data = await res.json();

        if (!res.ok) {
          console.error("Erreur serveur :", data);
          setError("❌ Commande introuvable ou erreur serveur.");
        } else {
          setOrder(data);
        }
      } catch (err) {
        console.error("Erreur communication API :", err);
        setError("⚠️ Erreur de communication avec le serveur.");
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, []);

  return (
    <div className="bg-gray-50 text-gray-900 flex flex-col min-h-screen">
      {/* HEADER */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <a href="/" className="flex items-center gap-3">
          <img
            src="/terrain_GE_gvapaintball_01.png"
            alt="Logo GVA Paintball"
            className="h-10"
          />
          <span className="text-2xl font-bold text-green-600">The Last</span>
        </a>
      </header>

      {/* MAIN */}
      <main className="flex flex-col items-center justify-center flex-1 p-6 text-center">
        {loading ? (
          <p className="text-gray-600 text-lg animate-pulse">
            Chargement des informations...
          </p>
        ) : error ? (
          <p className="text-red-600 text-lg">{error}</p>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-green-600 mb-6">
              🎉 Paiement confirmé !
            </h1>

            <div className="mt-6 bg-white shadow-lg rounded-lg p-6 max-w-md w-full text-left border border-green-100">
              <p>
                <strong>Nom :</strong> {order.firstName} {order.lastName}
              </p>
              <p>
                <strong>Type de billet :</strong> {order.type}
              </p>
              <p>
                <strong>Prix :</strong> {order.price} CHF
              </p>
              <p>
                <strong>Email :</strong> {order.email}
              </p>
              <p>
                <strong>Facture :</strong>{" "}
                <a
                  href={`/api/download-pdf?id=${order.id}&type=invoice`}
                  className="text-yellow-600 hover:underline"
                >
                  📄 Télécharger
                </a>
              </p>
              <p>
                <strong>Billet :</strong>{" "}
                <a
                  href={`/api/download-pdf?id=${order.id}&type=ticket`}
                  className="text-green-600 hover:underline"
                >
                  🎟 Télécharger
                </a>
              </p>
              <p>
                <strong>Statut :</strong>{" "}
                {order.status === "PAID" ? "✅ Envoyé" : "⏳ En cours"}
              </p>
            </div>

            <a
              href="/"
              className="mt-8 inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
            >
              Retour à l'accueil
            </a>
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-100 p-6 text-center text-sm text-gray-500">
        © 2025 The Last — Tous droits réservés
      </footer>
    </div>
  );
}
