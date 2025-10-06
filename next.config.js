/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Active le mode strict React (bonne pratique)
  reactStrictMode: true,

  // ✅ Permet d’exécuter l’app dans Vercel / Docker sans dépendances inutiles
  output: "standalone",

  // ✅ Corrige les modules Node (fs utilisé par pdfkit, etc.)
  webpack(config) {
    config.resolve.fallback = { fs: false };
    return config;
  },

  // ✅ Redirections automatiques depuis tes anciens fichiers .html
  async redirects() {
    return [
      {
        source: "/index.html",
        destination: "/",
        permanent: true,
      },
      {
        source: "/checkout.html",
        destination: "/checkout",
        permanent: true,
      },
      {
        source: "/success.html",
        destination: "/success",
        permanent: true,
      },
      {
        source: "/cancel.html",
        destination: "/cancel",
        permanent: true,
      },
      {
        source: "/admin.html",
        destination: "/admin",
        permanent: true,
      },
      {
        source: "/about.html",
        destination: "/about",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
