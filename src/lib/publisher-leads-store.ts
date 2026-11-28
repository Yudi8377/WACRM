import { randomUUID } from "node:crypto";
import { getDbPool, isDatabaseConfigured } from "@/lib/db";

export interface PublisherWebsiteLeadRecord {
  id: string;
  registrationCode: string;
  fullName: string;
  companyName: string;
  email: string;
  whatsapp: string;
  city: string;
  industry: string;
  teamSize: string;
  interestedEdition: "starter" | "pro" | "enterprise" | "sovereign";
  source: "enterprise_website" | "website_ai_chat" | "whatsapp_inbound" | "manual_ems";
  notes: string;
  status: "new" | "ai_engaged" | "qualified" | "follow_up" | "converted" | "archived";
  aiScore: number;
  aiRecommendedEdition: "starter" | "pro" | "enterprise" | "sovereign";
  aiWelcomeReply: string;
  followUpStage: "H+0" | "H+1" | "H+3" | "H+7" | "closed";
  lastFollowUpAt: string | null;
  chatTranscriptJson: string;
  createdAt: string;
  updatedAt: string;
}

const g = globalThis as unknown as {
  __wacrmWebsiteLeads?: Map<string, PublisherWebsiteLeadRecord>;
  __wacrmWebsiteLeadsTableReady?: boolean;
};

function getMemLeads(): Map<string, PublisherWebsiteLeadRecord> {
  if (!g.__wacrmWebsiteLeads) g.__wacrmWebsiteLeads = new Map();
  return g.__wacrmWebsiteLeads;
}

async function ensureWebsiteLeadsTable(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  if (g.__wacrmWebsiteLeadsTableReady) return true;
  try {
    const pool = getDbPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS publisher_website_leads (
        id TEXT PRIMARY KEY,
        registration_code TEXT NOT NULL,
        full_name TEXT NOT NULL,
        company_name TEXT NOT NULL,
        email TEXT NOT NULL,
        whatsapp TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT 'Indonesia',
        industry TEXT NOT NULL DEFAULT 'UMKM & Retail',
        team_size TEXT NOT NULL DEFAULT '1-5 orang',
        interested_edition TEXT NOT NULL DEFAULT 'pro',
        source TEXT NOT NULL DEFAULT 'enterprise_website',
        notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'ai_engaged',
        ai_score INTEGER NOT NULL DEFAULT 70,
        ai_recommended_edition TEXT NOT NULL DEFAULT 'pro',
        ai_welcome_reply TEXT NOT NULL DEFAULT '',
        follow_up_stage TEXT NOT NULL DEFAULT 'H+0',
        last_follow_up_at TIMESTAMPTZ,
        chat_transcript_json TEXT NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_publisher_website_leads_created
        ON publisher_website_leads (created_at DESC);
    `);
    g.__wacrmWebsiteLeadsTableReady = true;
    return true;
  } catch {
    return false;
  }
}

function rowToLead(row: Record<string, unknown>): PublisherWebsiteLeadRecord {
  return {
    id: String(row.id),
    registrationCode: String(row.registration_code),
    fullName: String(row.full_name),
    companyName: String(row.company_name),
    email: String(row.email),
    whatsapp: String(row.whatsapp ?? ""),
    city: String(row.city ?? "Indonesia"),
    industry: String(row.industry ?? "UMKM & Retail"),
    teamSize: String(row.team_size ?? "1-5 orang"),
    interestedEdition: (row.interested_edition as PublisherWebsiteLeadRecord["interestedEdition"]) || "pro",
    source: (row.source as PublisherWebsiteLeadRecord["source"]) || "enterprise_website",
    notes: String(row.notes ?? ""),
    status: (row.status as PublisherWebsiteLeadRecord["status"]) || "ai_engaged",
    aiScore: Number(row.ai_score ?? 70),
    aiRecommendedEdition:
      (row.ai_recommended_edition as PublisherWebsiteLeadRecord["aiRecommendedEdition"]) || "pro",
    aiWelcomeReply: String(row.ai_welcome_reply ?? ""),
    followUpStage: (row.follow_up_stage as PublisherWebsiteLeadRecord["followUpStage"]) || "H+0",
    lastFollowUpAt: row.last_follow_up_at ? new Date(String(row.last_follow_up_at)).toISOString() : null,
    chatTranscriptJson: String(row.chat_transcript_json ?? "[]"),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function listPublisherWebsiteLeads(limit = 200): Promise<PublisherWebsiteLeadRecord[]> {
  const ready = await ensureWebsiteLeadsTable();
  if (ready) {
    try {
      const pool = getDbPool();
      const res = await pool.query(
        `SELECT * FROM publisher_website_leads ORDER BY created_at DESC LIMIT $1`,
        [Math.min(500, Math.max(1, limit))],
      );
      return res.rows.map((r) => rowToLead(r as Record<string, unknown>));
    } catch {
      // Fall through to memory
    }
  }
  return Array.from(getMemLeads().values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function upsertPublisherWebsiteLead(
  input: Omit<PublisherWebsiteLeadRecord, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<PublisherWebsiteLeadRecord> {
  const now = new Date().toISOString();
  const record: PublisherWebsiteLeadRecord = {
    ...input,
    id: input.id || `lead-${randomUUID().slice(0, 12)}`,
    createdAt: now,
    updatedAt: now,
  };
  getMemLeads().set(record.id, record);

  const ready = await ensureWebsiteLeadsTable();
  if (ready) {
    try {
      const pool = getDbPool();
      await pool.query(
        `
        INSERT INTO publisher_website_leads (
          id, registration_code, full_name, company_name, email, whatsapp, city, industry,
          team_size, interested_edition, source, notes, status, ai_score,
          ai_recommended_edition, ai_welcome_reply, follow_up_stage, last_follow_up_at,
          chat_transcript_json, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
        )
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          company_name = EXCLUDED.company_name,
          email = EXCLUDED.email,
          whatsapp = EXCLUDED.whatsapp,
          city = EXCLUDED.city,
          industry = EXCLUDED.industry,
          team_size = EXCLUDED.team_size,
          interested_edition = EXCLUDED.interested_edition,
          notes = EXCLUDED.notes,
          status = EXCLUDED.status,
          ai_score = EXCLUDED.ai_score,
          ai_recommended_edition = EXCLUDED.ai_recommended_edition,
          ai_welcome_reply = EXCLUDED.ai_welcome_reply,
          follow_up_stage = EXCLUDED.follow_up_stage,
          last_follow_up_at = EXCLUDED.last_follow_up_at,
          chat_transcript_json = EXCLUDED.chat_transcript_json,
          updated_at = NOW()
        `,
        [
          record.id,
          record.registrationCode,
          record.fullName,
          record.companyName,
          record.email,
          record.whatsapp,
          record.city,
          record.industry,
          record.teamSize,
          record.interestedEdition,
          record.source,
          record.notes,
          record.status,
          record.aiScore,
          record.aiRecommendedEdition,
          record.aiWelcomeReply,
          record.followUpStage,
          record.lastFollowUpAt,
          record.chatTranscriptJson,
          record.createdAt,
          record.updatedAt,
        ],
      );
    } catch {
      // Keep memory fallback
    }
  }
  return record;
}

export async function updatePublisherWebsiteLead(
  id: string,
  patch: Partial<PublisherWebsiteLeadRecord>,
): Promise<PublisherWebsiteLeadRecord | null> {
  const existing = (await listPublisherWebsiteLeads(500)).find((l) => l.id === id);
  if (!existing) return null;
  const updated: PublisherWebsiteLeadRecord = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  return upsertPublisherWebsiteLead(updated);
}

export async function deletePublisherWebsiteLead(id: string): Promise<boolean> {
  getMemLeads().delete(id);
  const ready = await ensureWebsiteLeadsTable();
  if (ready) {
    try {
      const pool = getDbPool();
      const res = await pool.query(`DELETE FROM publisher_website_leads WHERE id = $1`, [id]);
      return (res.rowCount ?? 0) > 0;
    } catch {
      return false;
    }
  }
  return true;
}
