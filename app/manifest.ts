import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "hippoHabit",
    short_name: "hippoHabit",
    description: "A quiet habit tracker for one person",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#f7f6f3",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/logo.png", sizes: "512x512", type: "image/png" },
      // The hippo sits well inside the maskable safe zone on a full-bleed background.
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
