import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_SITE_CONTENT, normalizeSiteContent, type SiteContent } from "@/lib/site-content";

const REDIS_KEY = "site_content:main";

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

function assertAdminAccess(claims: unknown, requireAllowlist: boolean) {
  const adminEmails = getConfiguredAdminEmails();
  const email = getClaimEmail(claims);

  if (adminEmails.length === 0) {
    if (requireAllowlist) {
      throw new Error("Admin writes require ADMIN_EMAILS to be configured.");
    }
    return;
  }

  if (!email || !adminEmails.includes(email)) {
    throw new Error("Unauthorized: this account is not allowed to edit site content.");
  }
}

async function getSupabaseWriteClient(context: {
  supabase: ReturnType<typeof createClient<Database>>;
  claims?: unknown;
}) {
  const hasServiceRole = Boolean(cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY));
  const production = process.env.NODE_ENV === "production";

  assertAdminAccess(context.claims, hasServiceRole || production);

  if (hasServiceRole) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  }

  if (production) {
    throw new Error("Admin writes require SUPABASE_SERVICE_ROLE_KEY in production.");
  }

  return context.supabase;
}

async function redisGet(): Promise<SiteContent | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/${REDIS_KEY}`, {
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

async function redisSet(value: SiteContent): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/set/${REDIS_KEY}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(JSON.stringify(value)),
    });
  } catch {
    /* ignore */
  }
}

async function redisDel(): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/del/${REDIS_KEY}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    /* ignore */
  }
}

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  // Redis-first
  const cached = await redisGet();
  if (cached) return { content: normalizeSiteContent(cached), source: "redis" as const };

  const supabase = getSupabaseReadClient();
  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("id", "main")
    .single();

  if (error) {
    console.error("[site_content] Failed to load content:", error.message);
    return { content: DEFAULT_SITE_CONTENT, source: "default" as const };
  }

  const content = normalizeSiteContent(data.data);
  await redisSet(content);
  return { content, source: "supabase" as const };
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
    // Write-through cache
    await redisSet(content);
    return { ok: true, content };
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
