import { toNextJsHandler } from "better-auth/next-js";
import { getAuth, isAuthConfigured } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notConfiguredResponse() {
  return Response.json(
    {
      error: "Database Neon dan AUTH_SECRET belum dikonfigurasi pada server ini. Buka /setup untuk panduan aktivasi.",
      code: "AUTH_NOT_CONFIGURED",
    },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  if (!isAuthConfigured()) return notConfiguredResponse();
  const handler = toNextJsHandler(getAuth());
  return handler.GET(request);
}

export async function POST(request: Request) {
  if (!isAuthConfigured()) return notConfiguredResponse();
  const handler = toNextJsHandler(getAuth());
  return handler.POST(request);
}
