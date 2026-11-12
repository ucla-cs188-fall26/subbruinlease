import { getImageStorage } from "@/lib/storage";

/**
 * Serves photos saved by the local (mock) storage. File names are random and never
 * reused, so they can be cached forever. With Supabase, photo URLs point at the
 * storage bucket instead and this route goes unused.
 */
export async function GET(_request: Request, { params }: RouteContext<"/uploads/[owner]/[file]">) {
  const { owner, file } = await params;
  const data = await getImageStorage().read(owner, file);
  if (!data) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
