import { z } from "zod";

const EUTILS = () =>
  process.env.NCBI_EUTILS_BASE_URL ?? "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export const pubmedSearchInputSchema = z.object({
  query: z.string().min(2).describe("PubMed search query (MeSH terms welcome)"),
  k: z.number().int().min(1).max(20).default(5).describe("Number of results"),
});

export type PubmedHit = {
  pmid: string;
  title: string;
  source: string;
  pubdate: string;
  authors: string[];
  url: string;
};

export async function pubmedSearch(
  input: z.infer<typeof pubmedSearchInputSchema>,
): Promise<{ hits: PubmedHit[]; query: string }> {
  const base = EUTILS();
  const key = process.env.NCBI_API_KEY;

  const esearch = new URL(`${base}/esearch.fcgi`);
  esearch.searchParams.set("db", "pubmed");
  esearch.searchParams.set("term", input.query);
  esearch.searchParams.set("retmax", String(input.k));
  esearch.searchParams.set("retmode", "json");
  if (key) esearch.searchParams.set("api_key", key);

  const searchRes = await fetch(esearch, { cache: "no-store" });
  if (!searchRes.ok) {
    throw new Error(`pubmed esearch ${searchRes.status}`);
  }
  const searchJson = (await searchRes.json()) as {
    esearchresult?: { idlist?: string[] };
  };
  const ids = searchJson.esearchresult?.idlist ?? [];
  if (ids.length === 0) return { hits: [], query: input.query };

  const esummary = new URL(`${base}/esummary.fcgi`);
  esummary.searchParams.set("db", "pubmed");
  esummary.searchParams.set("id", ids.join(","));
  esummary.searchParams.set("retmode", "json");
  if (key) esummary.searchParams.set("api_key", key);

  const summaryRes = await fetch(esummary, { cache: "no-store" });
  if (!summaryRes.ok) {
    throw new Error(`pubmed esummary ${summaryRes.status}`);
  }
  const summaryJson = (await summaryRes.json()) as {
    result?: Record<string, unknown>;
  };

  const hits: PubmedHit[] = ids
    .map((pmid) => {
      const entry = summaryJson.result?.[pmid] as
        | {
            title?: string;
            source?: string;
            pubdate?: string;
            authors?: { name: string }[];
          }
        | undefined;
      if (!entry) return null;
      return {
        pmid,
        title: entry.title ?? "(no title)",
        source: entry.source ?? "",
        pubdate: entry.pubdate ?? "",
        authors: (entry.authors ?? []).slice(0, 3).map((a) => a.name),
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      } satisfies PubmedHit;
    })
    .filter((x): x is PubmedHit => x !== null);

  return { hits, query: input.query };
}
