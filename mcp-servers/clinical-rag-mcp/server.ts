import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  pubmedSearch,
  pubmedSearchInputSchema,
} from "./tools/pubmed";
import { niceGuideline, niceGuidelineInputSchema } from "./tools/nice";
import {
  fhirPatientContext,
  fhirPatientContextInputSchema,
} from "./tools/fhir";
import { kbSearch, kbSearchInputSchema } from "./tools/kb";

export const SERVER_INFO = {
  name: "clinical-rag-mcp",
  version: "0.1.0",
} as const;

export const TOOL_REGISTRY = [
  {
    name: "pubmed.search",
    title: "Search PubMed",
    description:
      "Search NCBI PubMed via E-utilities and return ranked biomedical literature hits with PMIDs and DOIs.",
  },
  {
    name: "nice.guideline",
    title: "Look up a NICE guideline",
    description:
      "Look up a UK NICE public guideline by ID (e.g. NG28) or topic substring. Returns guideline metadata + URL.",
  },
  {
    name: "fhir.patient_context",
    title: "Fetch synthetic FHIR patient context",
    description:
      "Pull Patient + Conditions + MedicationRequests from the HAPI FHIR R4 public sandbox (synthetic data only).",
  },
  {
    name: "kb.search",
    title: "Search this repo's docs",
    description:
      "Keyword-frequency search over this project's own docs and the NICE corpus snapshot. Useful for grounding questions about this demo.",
  },
] as const;

export function buildServer(): McpServer {
  const server = new McpServer(SERVER_INFO, {
    capabilities: { tools: {} },
  });

  server.tool(
    "pubmed.search",
    "Search NCBI PubMed via E-utilities and return ranked biomedical literature hits with PMIDs and links.",
    pubmedSearchInputSchema.shape,
    async (args) => {
      const result = await pubmedSearch(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      };
    },
  );

  server.tool(
    "nice.guideline",
    "Look up a UK NICE public guideline by ID (e.g. NG28) or topic substring.",
    niceGuidelineInputSchema.shape,
    async (args) => {
      const result = await niceGuideline(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  server.tool(
    "fhir.patient_context",
    "Pull Patient + Conditions + MedicationRequests from the HAPI FHIR R4 public sandbox (synthetic data only).",
    fhirPatientContextInputSchema.shape,
    async (args) => {
      const result = await fhirPatientContext(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  server.tool(
    "kb.search",
    "Keyword-frequency search over this project's own docs and the NICE corpus snapshot.",
    kbSearchInputSchema.shape,
    async (args) => {
      const result = await kbSearch(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  return server;
}
