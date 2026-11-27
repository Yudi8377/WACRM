import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSafeSession, isAuthConfigured } from "@/lib/auth";
import { DirectAppEntry } from "@/components/crm/direct-app-entry";

export const dynamic = "force-dynamic";

/**
 * Direct Business Application Entry Point (`/`):
 * - If Neon DB + Auth is configured and the user has an active session, goes straight to `/dashboard`.
 * - Otherwise, immediately opens the full interactive WACRM v3.0.0 Business Application
 *   (Inbox AI Otomatis, Master Data, POS & Label QR, ERP, Akuntansi, Multi-Agent AI, 24/7 AI Voice Companion)
 *   with zero announcement/marketing walls.
 */
export default async function HomePage() {
  if (isAuthConfigured()) {
    const session = await getSafeSession(await headers());
    if (session) {
      redirect("/dashboard");
    }
  }
  return <DirectAppEntry />;
}
