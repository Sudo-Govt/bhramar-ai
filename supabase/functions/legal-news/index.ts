// Indian legal news aggregator. Pulls RSS from LiveLaw + Bar & Bench, returns top headlines.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FEEDS = [
  { source: "LiveLaw", url: "https://www.livelaw.in/rss/top-stories" },
  { source: "Bar & Bench", url: "https://www.barandbench.com/feed" },
];

type Item = { title: string; link: string; summary: string; source: string; pubDate: string };

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

function parseRSS(xml: string, source: string): Item[] {
  const items: Item[] = [];
  const re = /<item[\s\S]*?<\/item>/g;
  const matches = xml.match(re) || [];
  for (const block of matches) {
    const title = decode(block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "");
    const link = decode(block.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] || "");
    const desc = decode(block.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1] || "");
    const pubDate = decode(block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1] || "");
    if (title) items.push({ title, link, summary: desc.slice(0, 220), source, pubDate });
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const settled = await Promise.allSettled(
      FEEDS.map(async (f) => {
        const r = await fetch(f.url, { headers: { "User-Agent": "Bhramar.ai/1.0" } });
        if (!r.ok) return [];
        return parseRSS(await r.text(), f.source);
      }),
    );
    const all: Item[] = [];
    for (const s of settled) if (s.status === "fulfilled") all.push(...s.value);
    // Dedup by title; sort newest first
    const seen = new Set<string>();
    const dedup = all.filter((i) => (seen.has(i.title) ? false : (seen.add(i.title), true)));
    dedup.sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime());
    return new Response(JSON.stringify({ items: dedup.slice(0, 15) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ items: [], error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
