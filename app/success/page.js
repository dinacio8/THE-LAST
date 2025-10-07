"use client";
import { useEffect, useState } from "react";

export default function SuccessPage() {
  const [order, setOrder] = useState(null);
  const [statusMsg, setStatusMsg] = useState("Chargement des informations...");
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id"); // 🟢 on utilise maintenant "id" au lieu de "session_id"

      if (!orderId) {
        setStatusMsg("❌ Impossible de retrouver les informations de commande.");
        setError(true);
        return;
      }

      try {
const res = await fetch(`/api/order-status?id=${id}`);
        const data = await res.json();

        if (!res.ok) {
          console.error("Erreur API:", data);
          setStatusMsg("❌ Commande introuvable ou erreur serveur.");
          setError(true);
          return;
        }

        setOrder(data);
        setError(false);
      } catch (err) {
        console.error("Erreur communication API:", err);
        setStatusMsg("⚠️ Erreur de communication avec le serveur.");
        setError(true);
      }
    }

    loadStatus();
  }, []);

  return (
    <main className="bg-gray-50 text-gray-900 flex flex-col min-h-screen">
      <section className="flex flex-col items-center justify-center flex-1 p-6 text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-6">
          🎉 Paiement confirmé !
        </h1>

        {/* Message d’attente ou d’erreur */}
        {!order && (
          <p className={`text-lg ${error ? "text-red-600" : "text-gray-700"}`}>
            {statusMsg}
          </p>
        )}

        {/* Détails de la commande */}
        {order && (
          <div className="mt-6 bg-white shadow-lg rounded-lg p-6 max-w-md text-left">
            <p>
              <strong>Nom :</strong> {order.first_name} {order.last_name}
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
              <strong>Statut :</strong>{" "}
              {order.sent ? "✅ Envoyé" : "⏳ En cours d’envoi"}
            </p>

            <div className="mt-4 text-center">
              <p className="text-gray-500 text-sm">
                Ton billet et ta facture ont été envoyés par e-mail.
              </p>
            </div>
          </div>
        )}

        <a
          href="/"
          className="mt-8 inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
        >
          Retour à l'accueil
        </a>
      </section>
    </main>
  );
}
