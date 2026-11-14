import type { NextConfig } from "next";

// Listing photos uploaded in Supabase mode are served from the project's storage bucket.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
// The local Supabase stack (`supabase start`) runs on 127.0.0.1, which next/image blocks by default.
const supabaseIsLocal = supabaseUrl !== null && ["127.0.0.1", "localhost"].includes(supabaseUrl.hostname);

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      // Photos used by the fake listing data.
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-*" },
      ...(supabaseUrl
        ? [
            {
              protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
              hostname: supabaseUrl.hostname,
              port: supabaseUrl.port,
              pathname: "/storage/v1/object/public/listing-images/**",
            },
          ]
        : []),
    ],
    dangerouslyAllowLocalIP: supabaseIsLocal,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
