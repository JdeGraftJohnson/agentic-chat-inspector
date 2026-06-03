import { z } from "zod";
import { randomUUID } from "node:crypto";
import { writeUnderSandbox } from "./sandbox";

export const calendarDraftInputSchema = z.object({
  title: z.string().min(1).max(180),
  start: z.string().describe("ISO-8601 start, e.g. 2026-06-15T14:00:00Z"),
  end: z.string().describe("ISO-8601 end, e.g. 2026-06-15T14:30:00Z"),
  attendees: z.array(z.string().email()).default([]),
  description: z.string().max(2000).default(""),
  location: z.string().max(200).default(""),
});

export type CalendarDraftResult = {
  draft_id: string;
  path: string;
  ics: string;
  disclaimer: string;
};

function toIcsDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${iso}`);
  }
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export async function calendarDraft(
  input: z.infer<typeof calendarDraftInputSchema>,
): Promise<CalendarDraftResult> {
  const id = randomUUID();
  const now = toIcsDate(new Date().toISOString());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//johndegraft.app//draft-actions-mcp//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${id}@johndegraft.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsDate(input.start)}`,
    `DTEND:${toIcsDate(input.end)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
  ];

  if (input.location) {
    lines.push(`LOCATION:${escapeIcsText(input.location)}`);
  }
  if (input.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(input.description)}`);
  }
  for (const email of input.attendees) {
    lines.push(
      `ATTENDEE;RSVP=TRUE;CN=${email};ROLE=REQ-PARTICIPANT:mailto:${email}`,
    );
  }
  lines.push("END:VEVENT", "END:VCALENDAR");

  const ics = lines.join("\r\n");
  const { path } = await writeUnderSandbox(`calendar/${id}.ics`, ics);

  return {
    draft_id: id,
    path,
    ics,
    disclaimer:
      "Calendar event NOT sent. ICS saved to a sandboxed /tmp directory; not delivered to Google / Outlook / Apple Calendar.",
  };
}
