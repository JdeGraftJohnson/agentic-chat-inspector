import { z } from "zod";
import { writeUnderSandbox } from "./sandbox";

export const fileWriteInputSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(256)
    .describe(
      "Relative path inside the per-run sandbox (e.g. 'notes/summary.md'). Absolute paths and parent traversal are rejected.",
    ),
  contents: z.string().max(64_000).describe("File contents, UTF-8."),
});

export type FileWriteResult = {
  path: string;
  bytes: number;
  disclaimer: string;
};

export async function fileWrite(
  input: z.infer<typeof fileWriteInputSchema>,
): Promise<FileWriteResult> {
  if (input.path.startsWith("/")) {
    throw new Error("Absolute paths are not allowed. Use a relative path.");
  }
  const { path, bytes } = await writeUnderSandbox(input.path, input.contents);
  return {
    path,
    bytes,
    disclaimer:
      "File written to a sandboxed /tmp directory only. Nothing reaches the real filesystem.",
  };
}
