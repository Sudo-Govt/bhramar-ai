import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, Newspaper, ExternalLink, Loader2 } from "lucide-react";

type NewsItem = { title: string; link: string; summary: string; source: string; pubDate: string };

export function NewsPanel() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("legal-news");
      if (!error && data?.items) setItems(data.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const visible = expanded ? items.slice(0, 10) : items.slice(0, 3);

  return (
    <div className="border-t border-border pt-3 mt-3">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          <Newspaper className="h-3 w-3 text-gold" /> Legal News
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-gold"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse news" : "Expand news"}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Fetching headlines…
        </div>
      ) : items.length === 0 ? (
        <div className="text-xs text-muted-foreground px-1 py-2">No headlines available.</div>
      ) : (
        <div className="space-y-1.5">
          {visible.map((n, i) => (
            <a
              key={i}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 rounded-lg glass-subtle hover:border-gold/40 border border-transparent transition-colors group"
            >
              <div className="flex items-start gap-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground line-clamp-2 leading-snug group-hover:text-gold">
                    {n.title}
                  </div>
                  {expanded && n.summary && (
                    <div className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{n.summary}</div>
                  )}
                  <div className="text-[10px] text-gold/70 mt-1">{n.source}</div>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
