"use client";

import { useEffect, useState } from "react";

export default function SuccessPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session_id = params.get("session_id");

    if (!session_id) {
      setError("❌ Impossible de retrouver les informations de la commande.");
      setLoading(false);
      return;
    }

    async function fetchStatus() {
      try {
        const res = await fetch(`/api/order-status?session_id=${session_id}`);
        if (!res.ok) {
          const errText = await res.text();
          console.error("Erreur API:", errText);
          setError("⚠️ Commande introuvable ou erreur serveur.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        console.error("Erreur communication serveur:", err);
        setError("⚠️ Erreur de communication avec le serveur.");
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center flex-1 min-h-screen text-center">
        <h1 className="text-2xl text-green-600 font-semibold mb-4">
          Chargement de ton paiement...
        </h1>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center flex-1 min-h-screen text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">❌ Erreur</h1>
        <p className="text-gray-700">{error}</p>
        <a
          href="/"
          className="mt-6 inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
        >
          Retour à l’accueil
        </a>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center flex-1 min-h-screen text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        🎉 Paiement confirmé !
      </h1>
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-md text-left">
        <p><strong>Nom :</strong> {order.firstName} {order.lastName}</p>
        <p><strong>Email :</strong> {order.email}</p>
        <p><strong>Type :</strong> {order.type}</p>
        <p><strong>Prix :</strong> {order.price} CHF</p>
        <p><strong>Statut :</strong> {order.status}</p>
      </div>
      <a
        href="/"
        className="mt-6 inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
      >
        Retour à l’accueil
      </a>
    </main>
  );
}
