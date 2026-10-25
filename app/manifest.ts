import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Body Double",
    short_name: "Body Double",
    description: "A party game where the Wolf learns to wear your friends' words.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D1912",
    theme_color: "#0D1912",
    icons: [{ src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" }],
  };
}
