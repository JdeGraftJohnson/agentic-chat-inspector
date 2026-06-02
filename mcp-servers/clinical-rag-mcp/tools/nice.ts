import { z } from "zod";
import niceSnapshot from "../corpus/nice-snapshot.json" with { type: "json" };

type NiceGuideline = {
  id: string;
  title: string;
  topic: string;
  url: string;
  summary: string;
  last_updated: string;
};

const ALL: NiceGuideline[] = (niceSnapshot as { guidelines: NiceGuideline[] })
  .guidelines;

export const niceGuidelineInputSchema = z.object({
  id: z
    .string()
    .optional()
    .describe(
      "NICE guideline ID (e.g. NG28). If omitted, the tool returns a topic-filtered list.",
    ),
  topic: z
    .string()
    .optional()
    .describe(
      "Topic substring to filter by (e.g. 'cardiology', 'diabetes'). Case-insensitive.",
    ),
  k: z.number().int().min(1).max(20).default(5),
});

export type NiceResult =
  | { kind: "single"; guideline: NiceGuideline }
  | { kind: "list"; matches: NiceGuideline[]; topic?: string };

export async function niceGuideline(
  input: z.infer<typeof niceGuidelineInputSchema>,
): Promise<NiceResult> {
  if (input.id) {
    const hit = ALL.find((g) => g.id.toLowerCase() === input.id!.toLowerCase());
    if (!hit) {
      throw new Error(
        `No NICE guideline ${input.id} in the local snapshot. Snapshot covers: ${ALL.map((g) => g.id).join(", ")}.`,
      );
    }
    return { kind: "single", guideline: hit };
  }

  const needle = input.topic?.toLowerCase();
  const matches = (
    needle
      ? ALL.filter(
          (g) =>
            g.topic.toLowerCase().includes(needle) ||
            g.title.toLowerCase().includes(needle) ||
            g.summary.toLowerCase().includes(needle),
        )
      : ALL
  ).slice(0, input.k);

  return { kind: "list", matches, topic: input.topic };
}
