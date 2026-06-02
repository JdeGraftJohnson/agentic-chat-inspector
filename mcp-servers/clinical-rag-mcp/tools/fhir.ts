import { z } from "zod";

const FHIR = () => process.env.HAPI_FHIR_BASE_URL ?? "https://hapi.fhir.org/baseR4";

export const fhirPatientContextInputSchema = z.object({
  patient_id: z
    .string()
    .describe(
      "FHIR Patient resource id from the HAPI public sandbox (synthetic data only).",
    ),
  include: z
    .array(z.enum(["conditions", "medications", "encounters"]))
    .default(["conditions", "medications"]),
});

type Patient = {
  id: string;
  name: string;
  gender?: string;
  birthDate?: string;
};

type ConditionLite = { code: string; display: string; onsetDate?: string };
type MedicationLite = { code: string; display: string; status?: string };

export type FhirContextResult = {
  patient: Patient;
  conditions?: ConditionLite[];
  medications?: MedicationLite[];
  encounters_count?: number;
  base_url: string;
  disclaimer: string;
};

async function fhirGet<T>(path: string): Promise<T> {
  const res = await fetch(`${FHIR()}${path}`, {
    headers: { Accept: "application/fhir+json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FHIR ${path} ${res.status}`);
  return (await res.json()) as T;
}

function pickName(resource: {
  name?: { given?: string[]; family?: string; text?: string }[];
}): string {
  const n = resource.name?.[0];
  if (!n) return "(unnamed)";
  if (n.text) return n.text;
  return `${(n.given ?? []).join(" ")} ${n.family ?? ""}`.trim() || "(unnamed)";
}

export async function fhirPatientContext(
  input: z.infer<typeof fhirPatientContextInputSchema>,
): Promise<FhirContextResult> {
  const patient = await fhirGet<{
    id: string;
    name?: { given?: string[]; family?: string; text?: string }[];
    gender?: string;
    birthDate?: string;
  }>(`/Patient/${input.patient_id}`);

  const result: FhirContextResult = {
    patient: {
      id: patient.id,
      name: pickName(patient),
      gender: patient.gender,
      birthDate: patient.birthDate,
    },
    base_url: FHIR(),
    disclaimer:
      "HAPI FHIR R4 public sandbox — synthetic patients only. Do not use for any real clinical decision.",
  };

  if (input.include.includes("conditions")) {
    const bundle = await fhirGet<{
      entry?: {
        resource?: {
          code?: {
            coding?: { code?: string; display?: string }[];
            text?: string;
          };
          onsetDateTime?: string;
        };
      }[];
    }>(`/Condition?patient=${input.patient_id}&_count=10`);
    result.conditions = (bundle.entry ?? [])
      .map((e): ConditionLite | null => {
        const r = e.resource;
        if (!r?.code) return null;
        const coding = r.code.coding?.[0];
        return {
          code: coding?.code ?? "",
          display: coding?.display ?? r.code.text ?? "(unspecified)",
          onsetDate: r.onsetDateTime,
        };
      })
      .filter((c): c is ConditionLite => c !== null);
  }

  if (input.include.includes("medications")) {
    const bundle = await fhirGet<{
      entry?: {
        resource?: {
          status?: string;
          medicationCodeableConcept?: {
            coding?: { code?: string; display?: string }[];
            text?: string;
          };
        };
      }[];
    }>(`/MedicationRequest?patient=${input.patient_id}&_count=10`);
    result.medications = (bundle.entry ?? [])
      .map((e): MedicationLite | null => {
        const r = e.resource;
        const concept = r?.medicationCodeableConcept;
        if (!concept) return null;
        const coding = concept.coding?.[0];
        return {
          code: coding?.code ?? "",
          display: coding?.display ?? concept.text ?? "(unspecified)",
          status: r?.status,
        };
      })
      .filter((m): m is MedicationLite => m !== null);
  }

  if (input.include.includes("encounters")) {
    const bundle = await fhirGet<{ total?: number }>(
      `/Encounter?patient=${input.patient_id}&_count=0&_summary=count`,
    );
    result.encounters_count = bundle.total ?? 0;
  }

  return result;
}
