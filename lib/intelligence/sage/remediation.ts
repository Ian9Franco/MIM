/**
 * SAGE 2.0 — Remediation Planner
 * ─────────────────────────────────────────────────────────────────────────────
 * Formulates prioritized, deterministic recovery plans with automatic
 * resolution capability flags for MIM UI and FOMO download broker.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CrashCategory, CrashEnvironment, RemediationPlan, SageLocale } from "./types";
import { buildLocalizedRemediation } from "./i18n";

export function planRemediation(
  category: CrashCategory,
  culprit: string | undefined,
  suspects: string[],
  env: CrashEnvironment,
  locale: SageLocale = "en"
): RemediationPlan {
  return buildLocalizedRemediation(category, culprit, suspects, env, locale);
}
