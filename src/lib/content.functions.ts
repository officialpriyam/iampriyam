import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_SITE_CONTENT, normalizeSiteContent, type SiteContent } from "@/lib/site-content";

const REDIS_KEY = "site_content:main";
const SITE_ASSETS_BUCKET = "site-assets";
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const DOCUMENT_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx"]);

function cleanEnv(value: string | undefined) {
  return value?.trim().replace(/^["']|["']$/g, "");
}

function getSupabaseReadClient() {
  const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const SUPABASE_PUBLISHABLE_KEY = cleanEnv(
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getConfiguredAdminEmails() {
  const value = cleanEnv(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL);
  if (!value) return [];
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getClaimEmail(claims: unknown) {
  if (claims === null || typeof claims !== "object") return "";
  const email = (claims as { email?: unknown }).email;
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function assertAdminAccess(claims: unknown) {
  const adminEmails = getConfiguredAdminEmails();
  const email = getClaimEmail(claims);

  if (adminEmails.length === 0) {
    return;
  }

  if (!email || !adminEmails.includes(email)) {
    throw new Error("Unauthorized: this account is not allowed to edit site content.");
  }
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function getDocumentContentType(contentType: string, fileName: string) {
  const normalizedType = contentType.trim().toLowerCase();
  if (DOCUMENT_CONTENT_TYPES.has(normalizedType)) return normalizedType;

  const extension = getExtension(fileName);
  if (extension === "pdf") return "application/pdf";
  if (extension === "doc") return "application/msword";
  if (extension === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "";
}

function sanitizeStorageFileName(fileName: string) {
  const extension = getExtension(fileName);
  const nameWithoutExtension = fileName.replace(/\.[^.]+$/, "");
  const safeName =
    nameWithoutExtension
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document";

  return `${safeName}.${extension}`;
}

function randomStorageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseUploadInput(input: unknown) {
  if (input === null || typeof input !== "object") {
    throw new Error("Invalid upload request.");
  }

  const values = input as {
    kind?: unknown;
    fileName?: unknown;
    contentType?: unknown;
    size?: unknown;
  };
  const kind = values.kind === "cv" || values.kind === "resume" ? values.kind : "";
  const fileName = typeof values.fileName === "string" ? values.fileName.trim() : "";
  const contentType = typeof values.contentType === "string" ? values.contentType : "";
  const size = typeof values.size === "number" ? values.size : Number(values.size);
  const extension = getExtension(fileName);
  const normalizedContentType = getDocumentContentType(contentType, fileName);

  if (!kind) throw new Error("Upload type must be CV or resume.");
  if (!fileName || !DOCUMENT_EXTENSIONS.has(extension)) {
    throw new Error("Only PDF, DOC, and DOCX files are supported.");
  }
  if (!normalizedContentType) {
    throw new Error("Only PDF, DOC, and DOCX files are supported.");
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_DOCUMENT_BYTES) {
    throw new Error("Document must be 10 MB or smaller.");
  }

  return { kind, fileName, contentType: normalizedContentType, size };
}

async function getSupabaseWriteClient(context: {
  supabase: ReturnType<typeof createClient<Database>>;
  claims?: unknown;
}) {
  const hasServiceRole = Boolean(cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY));

  assertAdminAccess(context.claims);

  if (hasServiceRole) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  }

  return context.supabase;
}

async function redisGet(): Promise<SiteContent | null> {
  const url = cleanEnv(process.env.UPSTASH_REDIS_REST_URL);
  const token = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(REDIS_KEY)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result: string | null };
    if (!json.result) return null;
    return JSON.parse(json.result) as SiteContent;
  } catch {
    return null;
  }
}

async function redisSet(value: SiteContent): Promise<boolean> {
  const url = cleanEnv(process.env.UPSTASH_REDIS_REST_URL);
  const token = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) return false;
  const serialized = JSON.stringify(value);
  try {
    const commandRes = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["SET", REDIS_KEY, serialized]),
    });
    if (commandRes.ok) return true;

    const res = await fetch(`${url}/set/${encodeURIComponent(REDIS_KEY)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/plain" },
      body: serialized,
    });
    if (res.ok) return true;

    if (serialized.length < 7000) {
      const urlCommandRes = await fetch(
        `${url}/set/${encodeURIComponent(REDIS_KEY)}/${encodeURIComponent(serialized)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return urlCommandRes.ok;
    }

    return false;
  } catch {
    return false;
  }
}

async function redisDel(): Promise<boolean> {
  const url = cleanEnv(process.env.UPSTASH_REDIS_REST_URL);
  const token = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) return false;
  try {
    const commandRes = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["DEL", REDIS_KEY]),
    });
    if (commandRes.ok) return true;

    const res = await fetch(`${url}/del/${encodeURIComponent(REDIS_KEY)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseReadClient();
  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("id", "main")
    .single();

  if (error) {
    const cached = await redisGet();
    if (cached) return { content: normalizeSiteContent(cached), source: "redis" as const };

    console.error("[site_content] Failed to load content:", error.message);
    return { content: DEFAULT_SITE_CONTENT, source: "default" as const };
  }

  const content = normalizeSiteContent(data.data);
  await redisSet(content);
  return { content, source: "supabase" as const };
});

export const getAdminSiteContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdminAccess(context.claims);

    const supabase = await getSupabaseWriteClient(context);
    const { data, error } = await supabase
      .from("site_content")
      .select("data")
      .eq("id", "main")
      .single();

    if (error) {
      console.error("[site_content] Failed to load admin content:", error.message);
      return { content: DEFAULT_SITE_CONTENT, source: "default" as const };
    }

    return { content: normalizeSiteContent(data.data), source: "supabase" as const };
  });

export const createAssetUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(parseUploadInput)
  .handler(async ({ data, context }) => {
    assertAdminAccess(context.claims);

    if (!cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      throw new Error("Uploads require SUPABASE_SERVICE_ROLE_KEY to be configured.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const safeFileName = sanitizeStorageFileName(data.fileName);
    const path = `documents/${data.kind}/${Date.now()}-${randomStorageId()}-${safeFileName}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from(SITE_ASSETS_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !signed) throw error ?? new Error("Failed to create upload URL.");

    const { data: publicData } = supabaseAdmin.storage.from(SITE_ASSETS_BUCKET).getPublicUrl(path);
    return {
      bucket: SITE_ASSETS_BUCKET,
      path,
      token: signed.token,
      publicUrl: publicData.publicUrl,
      contentType: data.contentType,
    };
  });

export const updateSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { data: SiteContent }) => input)
  .handler(async ({ data, context }) => {
    const content = normalizeSiteContent(data.data);
    const supabase = await getSupabaseWriteClient(context);
    const { error } = await supabase
      .from("site_content")
      .upsert({ id: "main", data: content, updated_at: new Date().toISOString() });
    if (error) throw error;

    const { data: saved, error: readError } = await supabase
      .from("site_content")
      .select("data")
      .eq("id", "main")
      .single();
    if (readError) throw readError;

    const savedContent = normalizeSiteContent(saved.data);

    // Clear stale cache first, then write the persisted Supabase value back.
    const cacheCleared = await redisDel();
    const cacheUpdated = await redisSet(savedContent);
    return {
      ok: true,
      content: savedContent,
      cache: cacheUpdated ? "updated" : cacheCleared ? "cleared" : "unavailable",
    };
  });

export const invalidateContentCache = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    await redisDel();
    return { ok: true };
  });

export const getConnectionStatus = createServerFn({ method: "GET" }).handler(async () => {
  const out = {
    redis: { configured: false, ok: false, latencyMs: 0, error: "" as string | undefined },
    supabase: { configured: true, ok: false, latencyMs: 0, error: "" as string | undefined },
  };

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    out.redis.configured = true;
    const t0 = Date.now();
    try {
      const res = await fetch(`${url}/ping`, { headers: { Authorization: `Bearer ${token}` } });
      out.redis.ok = res.ok;
      if (!res.ok) out.redis.error = `HTTP ${res.status}`;
    } catch (e) {
      out.redis.error = String(e);
    }
    out.redis.latencyMs = Date.now() - t0;
  }

  const t1 = Date.now();
  try {
    const supabase = getSupabaseReadClient();
    const { error } = await supabase.from("site_content").select("id").eq("id", "main").single();
    out.supabase.ok = !error;
    if (error) out.supabase.error = error.message;
  } catch (e) {
    out.supabase.error = String(e);
  }
  out.supabase.latencyMs = Date.now() - t1;

  return out;
});
