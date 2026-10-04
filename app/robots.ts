import type { MetadataRoute } from "next";

// Keeps well-behaved crawlers off the click-tracking redirect (so they are not
// counted as interest) and out of the private areas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/go/", "/admin", "/login", "/auth/"],
    },
  };
}
