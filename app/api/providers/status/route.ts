import { NextResponse } from "next/server";
import { PROVIDERS, type ProviderId } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProviderStatus = {
  id: ProviderId;
  label: string;
  modelLabel: string;
  available: boolean;
  reason?: string;
};

function checkSubscription(): { available: boolean; reason?: string } {
  if (process.env.VERCEL) {
    return {
      available: false,
      reason:
        "Subscription auth requires the local claude CLI; not available on Vercel serverless. Clone and run locally to use this provider.",
    };
  }
  return { available: true };
}

export async function GET() {
  const statuses: ProviderStatus[] = (Object.keys(PROVIDERS) as ProviderId[]).map(
    (id) => {
      const entry = PROVIDERS[id];
      if (entry.kind === "subscription") {
        const sub = checkSubscription();
        return {
          id,
          label: entry.label,
          modelLabel: entry.modelLabel,
          available: sub.available,
          reason: sub.reason,
        };
      }
      const hasKey = entry.envKey && Boolean(process.env[entry.envKey]);
      return {
        id,
        label: entry.label,
        modelLabel: entry.modelLabel,
        available: Boolean(hasKey),
        reason: hasKey
          ? undefined
          : `Set ${entry.envKey} in .env.local (or in Vercel env vars) to enable this provider.`,
      };
    },
  );

  const anyAvailable = statuses.some((s) => s.available);
  return NextResponse.json({
    statuses,
    anyAvailable,
    hostedOnVercel: Boolean(process.env.VERCEL),
  });
}
