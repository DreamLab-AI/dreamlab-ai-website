// src/data/workshop-meta.ts
//
// Curated display metadata for the self-guided workshop modules, keyed by the
// folder id in public/data/workshops/ (the same ids that appear in the
// generated src/data/workshop-list.json and in useWorkshopProgress storage).
//
// WHY A MAP AND NOT `generate-workshop-list.mjs`:
//   The generator only sees the machine-cased folder name (e.g.
//   `01 - Morning Vscode Setup`). It cannot supply acronym-correct short titles
//   ("VS Code setup", "RAG systems", "QA & automation"), the curriculum order,
//   or per-module difficulty — none of which live in the folders. The mobile
//   Workshops index (§05) and Workshop module (§06) both need those, so the map
//   is the single source the design handoff explicitly sanctions ("add a
//   display-name map — do not sentence-case at render and hope").
//
// Difficulty / hours mirror the phase definitions in src/pages/WorkshopIndex.tsx
// (PHASES) so the two surfaces agree.

export type WorkshopPeriod = 'Morning' | 'Afternoon' | '';
export type WorkshopDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface WorkshopMeta {
  /** Curriculum order (foundations → capstone), used to sort the mobile list. */
  order: number;
  /** Two-digit module number for the mono column, or '' for the reference pathway. */
  module: string;
  /** Acronym-correct short display title. */
  title: string;
  /** Session period, or '' when the module is not a morning/afternoon slot. */
  period: WorkshopPeriod;
  difficulty: WorkshopDifficulty;
  /** Estimated hours (matches PHASES estimatedHours per workshop). */
  hours: number;
}

export const WORKSHOP_META: Record<string, WorkshopMeta> = {
  'workshop-00-infra': { order: 1, module: '00', title: 'Infrastructure setup', period: '', difficulty: 'beginner', hours: 2 },
  'workshop-01-morning-vscode-setup': { order: 2, module: '01', title: 'VS Code setup', period: 'Morning', difficulty: 'beginner', hours: 3 },
  'vscode-learning-pathway': { order: 3, module: '', title: 'VS Code learning pathway', period: '', difficulty: 'beginner', hours: 3 },
  'workshop-01-afternoon-visual-version-control': { order: 4, module: '01', title: 'Visual tools & version control', period: 'Afternoon', difficulty: 'beginner', hours: 3 },
  'workshop-02-morning-ai-api-access': { order: 5, module: '02', title: 'Direct AI API access', period: 'Morning', difficulty: 'intermediate', hours: 3 },
  'workshop-02-afternoon-vibe-coding': { order: 6, module: '02', title: 'Vibe coding', period: 'Afternoon', difficulty: 'intermediate', hours: 3 },
  'workshop-08-claude-code': { order: 7, module: '08', title: 'Claude Code mastery', period: '', difficulty: 'intermediate', hours: 6 },
  'workshop-03-morning-local-ai': { order: 8, module: '03', title: 'Local AI models', period: 'Morning', difficulty: 'intermediate', hours: 3 },
  'workshop-03-afternoon-rag-system': { order: 9, module: '03', title: 'RAG systems', period: 'Afternoon', difficulty: 'intermediate', hours: 3 },
  'workshop-07-docker-containers': { order: 10, module: '07', title: 'Docker & containers', period: '', difficulty: 'intermediate', hours: 6 },
  'workshop-04-morning-ai-agents': { order: 11, module: '04', title: 'Specialised AI agents', period: 'Morning', difficulty: 'advanced', hours: 3 },
  'workshop-04-afternoon-orchestration': { order: 12, module: '04', title: 'Agent orchestration', period: 'Afternoon', difficulty: 'advanced', hours: 3 },
  'workshop-06-codex': { order: 13, module: '06', title: 'AI coding ecosystem', period: '', difficulty: 'advanced', hours: 4 },
  'workshop-05-morning-qa-automation': { order: 14, module: '05', title: 'QA & automation', period: 'Morning', difficulty: 'intermediate', hours: 3 },
  'workshop-05-afternoon-publishing': { order: 15, module: '05', title: 'Professional output suite', period: 'Afternoon', difficulty: 'intermediate', hours: 3 },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Row meta for the Workshops index, e.g. "Morning · intermediate" or "Beginner". */
export function workshopRowMeta(m: WorkshopMeta): string {
  return m.period ? `${m.period} · ${m.difficulty}` : cap(m.difficulty);
}

/** All-caps eyebrow for the Workshop module, e.g. "MORNING · INTERMEDIATE · 3 HRS". */
export function workshopEyebrow(m: WorkshopMeta): string {
  return [m.period, m.difficulty, `${m.hours} hrs`]
    .filter(Boolean)
    .join(' · ')
    .toUpperCase();
}
