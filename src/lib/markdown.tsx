import React from "react";

// Lightweight markdown renderer (headings, lists, bold, italics, paragraphs).
// Bold renders in gold for cited statutory references.
export function MiniMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuf: string[] = []; let listType: "ul" | "ol" | null = null;
  const flushList = (key: string) => {
    if (!listBuf.length) return;
    const items = listBuf.map((l, i) => <li key={i}>{renderInline(l)}</li>);
    blocks.push(listType === "ol" ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>);
    listBuf = []; listType = null;
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) { flushList(`l-${i}`); return; }
    if (/^### /.test(line)) { flushList(`l-${i}`); blocks.push(<h3 key={i}>{renderInline(line.slice(4))}</h3>); return; }
    if (/^## /.test(line))  { flushList(`l-${i}`); blocks.push(<h3 key={i}>{renderInline(line.slice(3))}</h3>); return; }
    if (/^# /.test(line))   { flushList(`l-${i}`); blocks.push(<h3 key={i}>{renderInline(line.slice(2))}</h3>); return; }
    if (/^[-*•]\s+/.test(line)) {
      if (listType !== "ul") flushList(`l-${i}`);
      listType = "ul"; listBuf.push(line.replace(/^[-*•]\s+/, "")); return;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (listType !== "ol") flushList(`l-${i}`);
      listType = "ol"; listBuf.push(line.replace(/^\d+\.\s+/, "")); return;
    }
    flushList(`l-${i}`);
    blocks.push(<p key={i}>{renderInline(line)}</p>);
  });
  flushList("end");
  return <div className="prose-legal space-y-1">{blocks}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Order matters: bold (**), then italics (_..._ or *...*)
  const tokens: React.ReactNode[] = [];
  let rest = text; let key = 0;
  const re = /(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*)/;
  while (rest.length) {
    const m = re.exec(rest);
    if (!m) { tokens.push(rest); break; }
    if (m.index > 0) tokens.push(rest.slice(0, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) tokens.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else tokens.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    rest = rest.slice(m.index + tok.length);
  }
  return tokens;
}

// Pull statutory citations like "Section 302 IPC", "CrPC §438", "Article 21" from text
export function extractCitations(text: string): string[] {
  const set = new Set<string>();
  const patterns = [
    /\b(Section|Sec\.?|§)\s*\d+[A-Z]?(?:\s*\(\d+\))?\s*(IPC|CrPC|CPC|NI Act|HMA|IT Act|Evidence Act)\b/gi,
    /\b(IPC|CrPC|CPC)\s*§?\s*\d+[A-Z]?\b/gi,
    /\bArticle\s+\d+[A-Z]?\b/gi,
  ];
  patterns.forEach((p) => {
    let m; while ((m = p.exec(text)) !== null) set.add(m[0].replace(/\s+/g, " "));
  });
  return Array.from(set).slice(0, 6);
}