"use client";

import { useEffect, useState, useRef } from "react";
import QrScanner from "qr-scanner";

const ADMIN_PASSWORD = "GvaPaintball2025."; // 🧠 même mot de passe que la page admin

export default function ScanPage() {
  const [isLogged, setIsLogged] = useState(false);
  const [password, setPassword] = useState("");
  const [scanner, setScanner] = useState(null);
  const [overlay, setOverlay] = useState(null); // ✅ pour l’écran de feedback
  const lastScanRef = useRef({ code: null, time: 0 });
  const cooldownRef = useRef(false);

  // 🔓 Connexion
  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsLogged(true);
      localStorage.setItem("isScannerAdmin", "true");
    } else {
      alert("Mot de passe incorrect ❌");
    }
  };

  // 🚪 Déconnexion
  const handleLogout = () => {
    localStorage.removeItem("isScannerAdmin");
    setIsLogged(false);
    if (scanner) scanner.stop();
  };

  // 📸 Démarre le scanner
  useEffect(() => {
    if (!isLogged) return;

    const videoElem = document.getElementById("video");
    if (!videoElem) return;

    const newScanner = new QrScanner(
      videoElem,
      async (result) => {
        const now = Date.now();

        // ⏱️ Ignore le même code dans les 3 dernières secondes
        if (
          cooldownRef.current ||
          (result.data === lastScanRef.current.code &&
            now - lastScanRef.current.time < 3000)
        ) {
          return;
        }

        cooldownRef.current = true;
        lastScanRef.current = { code: result.data, time: now };

        await handleScan(result.data);

        // ⏳ Pause le scan pendant 2,5 secondes avant reprise
        newScanner.pause();
        setTimeout(() => {
          cooldownRef.current = false;
          newScanner.start();
        }, 2500);
      },
      { highlightScanRegion: true, highlightCodeOutline: true }
    );

    newScanner.start();
    setScanner(newScanner);

    return () => {
      newScanner.stop();
    };
  }, [isLogged]);

  // 📡 Vérifie le billet scanné
  const handleScan = async (data) => {
    try {
      const url = new URL(data);
      const id = url.searchParams.get("id");

      if (!id) {
        showOverlay("QR code invalide ❌", "red");
        return;
      }

      const res = await fetch(`/api/scan-ticket?id=${id}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Erreur serveur");

      if (json.valid) {
        showOverlay(
          `✅ Billet valide : ${json.order.first_name} ${json.order.last_name}`,
          "green"
        );
      } else {
        showOverlay(json.message || "❌ Billet déjà utilisé", "red");
      }
    } catch (err) {
      console.error("Erreur scan:", err);
      showOverlay("⚠️ Erreur de communication", "orange");
    }
  };

  // 🟢 Affiche la bannière plein écran
  const showOverlay = (message, color) => {
    setOverlay({ message, color });
    setTimeout(() => setOverlay(null), 2000); // 🕒 disparaît après 2 sec
  };

  return (
    <main className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-6 relative">
      {/* 🔒 Connexion */}
      {!isLogged ? (
        <div className="bg-white text-gray-900 p-6 rounded-lg shadow-lg w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            Accès scanner
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="border border-gray-300 rounded-md w-full p-2 mb-3"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <button
            onClick={handleLogin}
            className="bg-green-600 hover:bg-green-700 text-white w-full py-2 rounded-md font-semibold"
          >
            Connexion
          </button>
        </div>
      ) : (
        <>
          {/* 🎫 Scanner */}
          <div className="w-full max-w-lg text-center">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-green-500">🎟️ Scanner de billets</h2>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md"
              >
                Déconnexion
              </button>
            </div>

            <video
              id="video"
              className="w-full rounded-lg border-2 border-green-500 shadow-lg"
            ></video>
          </div>

          {/* 🟩🟥 Bannière plein écran */}
          {overlay && (
            <div
              className={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${
                overlay.color === "green"
                  ? "bg-green-600"
                  : overlay.color === "red"
                  ? "bg-red-600"
                  : "bg-orange-500"
              } bg-opacity-95 text-white transition-all duration-200`}
            >
              {overlay.message}
            </div>
          )}
        </>
      )}
    </main>
  );
}
