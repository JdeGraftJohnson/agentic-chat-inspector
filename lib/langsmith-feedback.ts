/**
 * Thin LangSmith REST wrapper for write-side telemetry from the chat route.
 * We avoid the langsmith JS client here because the route runtime already
 * uses wrapAISDK from langsmith/experimental/vercel and we only need three
 * primitives: create_feedback, list_annotation_queues, add_runs_to_queue.
 */
const ENDPOINT = process.env.LANGSMITH_ENDPOINT ?? "https://api.smith.langchain.com";
const ANNOTATION_QUEUE_NAME =
  process.env.LANGSMITH_ANNOTATION_QUEUE ??
  "agentic-chat-inspector-tool-use-review";

function authHeaders(): HeadersInit | null {
  const key = process.env.LANGSMITH_API_KEY;
  if (!key) return null;
  return {
    "Content-Type": "application/json",
    "x-api-key": key,
  };
}

export function tracingEnabled(): boolean {
  return process.env.LANGSMITH_TRACING === "true" && Boolean(process.env.LANGSMITH_API_KEY);
}

export async function createFeedback(opts: {
  runId: string;
  key: string;
  score: number | null;
  comment?: string;
}): Promise<void> {
  const headers = authHeaders();
  if (!headers) return;
  try {
    await fetch(`${ENDPOINT}/feedback`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        run_id: opts.runId,
        key: opts.key,
        score: opts.score,
        comment: opts.comment,
      }),
    });
  } catch {
    // Best-effort; never break the chat response on telemetry failure.
  }
}

let cachedQueueId: string | null = null;

async function resolveQueueId(): Promise<string | null> {
  if (cachedQueueId) return cachedQueueId;
  const headers = authHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(
      `${ENDPOINT}/annotation-queues?name=${encodeURIComponent(ANNOTATION_QUEUE_NAME)}`,
      { headers },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: { id: string }[] } | { id: string }[];
    const items = Array.isArray(data) ? data : data.items ?? [];
    if (items.length === 0) return null;
    cachedQueueId = items[0].id;
    return cachedQueueId;
  } catch {
    return null;
  }
}

export async function addRunToReviewQueue(runId: string): Promise<void> {
  const headers = authHeaders();
  if (!headers) return;
  const queueId = await resolveQueueId();
  if (!queueId) return;
  try {
    await fetch(`${ENDPOINT}/annotation-queues/${queueId}/runs`, {
      method: "POST",
      headers,
      body: JSON.stringify({ run_ids: [runId] }),
    });
  } catch {
    /* best effort */
  }
}

export const REVIEW_QUEUE_NAME = ANNOTATION_QUEUE_NAME;
