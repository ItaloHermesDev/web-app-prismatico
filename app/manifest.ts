import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prismático",
    short_name: "Prismático",
    description: "Seu plano alimentar na prática.",
    start_url: "/hoje",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#007585",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
