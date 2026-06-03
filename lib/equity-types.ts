/**
 * TypeScript twin of the Python equity_audit.types data contracts.
 * Kept in sync manually — the JSON schema is the contract.
 */
export type Verdict = "pass" | "tighten" | "block";

export type SliceMetric = {
  label: string;
  n: number;
  metric:
    | "equalized_odds"
    | "demographic_parity"
    | "calibration_gap"
    | "fnr_gap";
  value: number;
  delta_vs_baseline: number;
  verdict: Verdict;
};

export type SliceResult = {
  axis: string;
  baseline_label: string;
  cells: SliceMetric[];
  worst_verdict: Verdict;
};

export type FrameworkItem = {
  id: string;
  description: string;
  status: Verdict;
  note: string | null;
};

export type FrameworkVerdict = {
  framework: string;
  verdict: Verdict;
  passed: number;
  tightened: number;
  blocked: number;
  items: FrameworkItem[];
};

export type AuditRecord = {
  version: string;
  generated_at: string;
  model_name: string;
  model_auc: number | null;
  n_predictions: number;
  threshold: number;
  slices: SliceResult[];
  framework_verdicts: FrameworkVerdict[];
  overall_verdict: Verdict;
  notes: string | null;
};

export const VERDICT_TONE: Record<Verdict, string> = {
  pass: "bg-emerald-900/40 text-emerald-300",
  tighten: "bg-amber-900/40 text-amber-200",
  block: "bg-red-900/40 text-red-300",
};
