import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "hippoHabit",
    short_name: "hippoHabit",
    description: "A quiet habit tracker for one person",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#f7f6f3",
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
