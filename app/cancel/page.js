export const metadata = {
  title: "Paiement annulé - The Last",
  description: "Ton paiement pour The Last n'a pas été finalisé. Tu peux réessayer.",
};

export default function CancelPage() {
  return (
    <div className="bg-gray-50 text-gray-900 flex flex-col min-h-screen">
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
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 flex flex-col justify-center items-center text-center px-4 pt-24">
        <h1 className="text-4xl font-bold text-red-600 mb-6">❌ Paiement annulé</h1>
        <p className="text-lg md:text-xl max-w-2xl mb-6">
          Ton paiement n’a pas pu être finalisé pour <strong>The Last</strong>.
        </p>
        <p className="text-gray-600 mb-8">
          Tu peux réessayer en choisissant ton billet à nouveau.&nbsp;
          Si le problème persiste, contacte-nous à&nbsp;
          <a
            href="mailto:info@gvapaintball.ch"
            className="text-green-600 hover:underline"
          >
            info@gvapaintball.ch
          </a>.
        </p>
        <a
          href="/#billets"
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg"
        >
          Réessayer le paiement
        </a>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-100 p-6 text-center text-sm text-gray-500">
        © 2025 The Last — Tous droits réservés
      </footer>
    </div>
  );
}
