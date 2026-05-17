// FILE: supabase/functions/_shared/config.ts
// Bhramar.ai — Centralized configuration + security constants

export const CONFIG = {
  // AI Gateway
  AI_GATEWAY: "https://ai.gateway.lovable.dev/v1",
  DEFAULT_CHAT_MODEL: "google/gemini-2.5-flash",
  
  // Super Admin — MUST be set in Supabase Dashboard → Edge Functions → Secrets
  // DO NOT hardcode emails here. Set SUPABASE_SUPER_ADMIN_EMAIL in env vars.
  // Super Admin — Set in Lovable Secrets as BHARAMAR_SUPER_ADMIN
  get SUPER_ADMIN_EMAIL(): string {
    const email = Deno.env.get("BHARAMAR_SUPER_ADMIN");
    if (!email) {
      console.warn("BHARAMAR_SUPER_ADMIN not set. Super admin features disabled.");
      return "";
    }
    return email;
  },
  
  // Rate Limiting
  RATE_LIMIT_RPM: parseInt(Deno.env.get("RATE_LIMIT_RPM") || "60"), // requests per minute
  RATE_LIMIT_WINDOW_MS: 60_000, // 1 minute
  
  // AI Provider Keys (fallback chain)
  get LOVABLE_API_KEY(): string {
    return Deno.env.get("LOVABLE_API_KEY") || "";
  },
  get GOOGLE_AI_KEY(): string {
    return Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY") || "";
  },
  get OPENAI_KEY(): string {
    return Deno.env.get("OPENAI_API_KEY") || "";
  },
  get ANTHROPIC_KEY(): string {
    return Deno.env.get("ANTHROPIC_API_KEY") || "";
  },
  
  // Supabase
  get SUPABASE_URL(): string {
    return Deno.env.get("SUPABASE_URL") || "";
  },
  get SERVICE_ROLE_KEY(): string {
    return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  },
  get ANON_KEY(): string {
    return Deno.env.get("SUPABASE_ANON_KEY") || "";
  },
};

// ─── Rate Limiting ─────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = CONFIG.RATE_LIMIT_WINDOW_MS;
  const maxRequests = CONFIG.RATE_LIMIT_RPM;
  
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  entry.count++;
  return { allowed: true };
}

// ─── Super Admin Check ─────────────────────────────────────────

export function isSuperAdmin(userEmail: string | null | undefined): boolean {
  if (!userEmail || !CONFIG.SUPER_ADMIN_EMAIL) return false;
  return userEmail.toLowerCase() === CONFIG.SUPER_ADMIN_EMAIL.toLowerCase();
}

// ─── Auth Helpers ──────────────────────────────────────────────

export function getAuthHeader(req: Request): string | null {
  return req.headers.get("Authorization");
}

export function jsonError(message: string, status: number = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
