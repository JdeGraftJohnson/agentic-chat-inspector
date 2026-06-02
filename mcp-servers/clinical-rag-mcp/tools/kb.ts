import { z } from "zod";
import kbCorpus from "../corpus/kb.json" with { type: "json" };

type KbDoc = { id: string; title: string; text: string };

const DOCS: KbDoc[] = (kbCorpus as { documents: KbDoc[] }).documents;

export const kbSearchInputSchema = z.object({
  query: z.string().min(2),
  k: z.number().int().min(1).max(10).default(3),
});

export type KbHit = {
  id: string;
  title: string;
  score: number;
  excerpt: string;
};

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function score(query: string, text: string): number {
  const q = tokenize(query);
  const t = tokenize(text);
  const tSet = new Map<string, number>();
  for (const tok of t) tSet.set(tok, (tSet.get(tok) ?? 0) + 1);
  let s = 0;
  for (const tok of q) {
    const tf = tSet.get(tok) ?? 0;
    if (tf > 0) s += 1 + Math.log(tf);
  }
  return s / Math.sqrt(t.length || 1);
}

function excerpt(query: string, text: string, len = 240): string {
  const q = tokenize(query)[0];
  if (!q) return text.slice(0, len);
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return text.slice(0, len);
  const start = Math.max(0, i - 60);
  return (start > 0 ? "…" : "") + text.slice(start, start + len) + "…";
}

export async function kbSearch(
  input: z.infer<typeof kbSearchInputSchema>,
): Promise<{ hits: KbHit[]; total: number }> {
  const ranked = DOCS.map((d) => ({
    id: d.id,
    title: d.title,
    score: score(input.query, `${d.title} ${d.text}`),
    excerpt: excerpt(input.query, d.text),
  }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.k);

  return { hits: ranked, total: DOCS.length };
}
