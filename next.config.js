/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ Nécessaire pour le nouvel App Router
  experimental: {
    appDir: true,
  },

  // ✅ Permet de générer une version standalone (utile pour Vercel ou Docker)
  output: "standalone",

  // ✅ Si ton projet doit lire des fichiers depuis /public ou /lib (comme ton Roboto-Regular.ttf)
  webpack(config) {
    config.resolve.fallback = { fs: false };
    return config;
  },

  // ✅ Redirections automatiques si jamais des .html sont demandés
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
    ];
  },
};

export default nextConfig;
