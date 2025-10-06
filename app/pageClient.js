"use client";
import { useEffect } from "react";

export default function HomePageClient() {
  useEffect(() => {
    // Burger menu toggle
    const burgerBtn = document.getElementById("burgerBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    if (burgerBtn && mobileMenu) {
      burgerBtn.addEventListener("click", () =>
        mobileMenu.classList.toggle("hidden")
      );
      document.querySelectorAll("#mobileMenu a").forEach((link) =>
        link.addEventListener("click", () =>
          mobileMenu.classList.add("hidden")
        )
      );
    }

    // Fade-in observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("show");
      });
    });
    document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

    // Button “Acheter billet”
    const buyBtn = document.getElementById("buyStandard");
    if (buyBtn) {
      buyBtn.addEventListener("click", () => {
        const USE_STRIPE = true;
        if (USE_STRIPE) {
          window.location.href = "/checkout?type=INDIVIDUEL";
        } else {
          window.location.href = "/fake-checkout?type=INDIVIDUEL";
        }
      });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <main className="bg-gray-50 text-gray-900 flex flex-col min-h-screen">
      {/* HEADER */}
      <header className="bg-white shadow fixed top-0 w-full z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center p-4">
          <a href="/" className="flex items-center gap-4">
            <img
              src="/terrain_GE_gvapaintball_01.png"
              alt="Logo GVA Paintball"
              className="h-10 md:h-16 lg:h-20 object-contain"
            />
            <span className="font-bold text-green-600 text-lg md:text-2xl">
              The Last
            </span>
          </a>
          <nav className="hidden md:flex gap-6 text-gray-700 font-semibold">
            <a href="#billets" className="hover:text-green-600">
              Billets
            </a>
            <a href="#programme" className="hover:text-green-600">
              Programme
            </a>
          </nav>
          <button id="burgerBtn" className="md:hidden flex flex-col gap-1">
            <span className="block w-6 h-0.5 bg-black"></span>
            <span className="block w-6 h-0.5 bg-black"></span>
            <span className="block w-6 h-0.5 bg-black"></span>
          </button>
        </div>

        <div
          id="mobileMenu"
          className="hidden flex-col bg-gray-100 p-4 md:hidden font-semibold"
        >
          <a href="#billets" className="py-2 hover:text-green-600">
            Billets
          </a>
          <a href="#programme" className="py-2 hover:text-green-600">
            Programme
          </a>
          <a href="/about" className="py-2 hover:text-green-600">
            À propos
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative hero-bg h-[70vh] flex items-center justify-center text-center">
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 text-white px-4">
          <h1 className="text-4xl md:text-6xl font-bold">The Last</h1>
          <p className="mt-4 text-lg md:text-2xl">
            Samedi 18 octobre 2025 — dès 19h — GVA Paintball
          </p>
          <a
            href="#billets"
            className="mt-6 inline-block bg-white text-green-600 hover:bg-green-100 font-bold py-3 px-6 rounded-lg pulse"
          >
            🎟 Réserver maintenant
          </a>
        </div>
      </section>

      {/* BILLETS */}
      <section
        id="billets"
        className="fade-in text-center py-16 bg-white scroll-mt-20"
      >
        <h2 className="text-3xl font-bold text-green-600 mb-6">
          Choisis ton billet
        </h2>
        <div className="flex flex-col md:flex-row justify-center gap-8">
          <button
            id="buyStandard"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-lg shadow-lg"
          >
            INDIVIDUEL - 5 CHF
          </button>
        </div>
      </section>

      {/* PROGRAMME */}
      <section
        id="programme"
        className="fade-in py-16 bg-gray-50 text-center scroll-mt-20"
      >
        <h2 className="text-3xl font-bold text-green-600 mb-6">Programme</h2>
        <ul className="space-y-4 text-lg">
          <li>19h00 — Ouverture des portes</li>
          <li>21h30 — Warm Up DJ</li>
          <li>23h00 — DJ principal</li>
          <li>02h00 — Set techno</li>
          <li>05h00 — After jusqu’au matin</li>
        </ul>
      </section>
    </main>
  );
}
