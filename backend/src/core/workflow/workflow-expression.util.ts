import type { WorkflowConditionOperator } from './workflow.types';

export interface WorkflowConditionRule {
  field: string;
  operator: WorkflowConditionOperator | string;
  value?: string;
}

export function getPathValue(root: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  const normalized = path.trim().replace(/^\{\{\s*|\s*\}\}$/g, '');
  return normalized.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, root);
}

export function buildExpressionContext(event: {
  payload: unknown;
  event_type: string;
  actor: { id: string; type: string };
  entity: { id: string; type: string };
  metadata?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    event: event,
    payload: event.payload as Record<string, unknown>,
    actor: event.actor,
    entity: event.entity,
    metadata: event.metadata ?? {},
  };
}

function parseList(expected: string | undefined): string[] {
  return String(expected ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function asLowerString(value: unknown): string {
  if (value == null) return '';
  return String(value).toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word match — avoids substring hits (e.g. "berhenti" inside "memberhentikan"). */
function containsWholeWord(haystack: string, word: string): boolean {
  const h = asLowerString(haystack);
  const w = asLowerString(word).trim();
  if (!w) return false;
  const pattern = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(w)}(?:[^\\p{L}\\p{N}]|$)`,
    'iu',
  );
  return pattern.test(h);
}

export function evaluateSingleCondition(
  context: Record<string, unknown>,
  field: string,
  operator: WorkflowConditionOperator | string | undefined,
  expected: string | undefined,
): boolean {
  const actual = getPathValue(context, field ?? '');
  const op = operator ?? 'exists';

  switch (op) {
    case 'eq':
      return String(actual ?? '') === String(expected ?? '');
    case 'neq':
      return String(actual ?? '') !== String(expected ?? '');
    case 'contains':
      return asLowerString(actual).includes(asLowerString(expected));
    case 'not_contains':
      return !asLowerString(actual).includes(asLowerString(expected));
    case 'contains_word':
      return containsWholeWord(asLowerString(actual), String(expected ?? ''));
    case 'not_contains_word':
      return !containsWholeWord(asLowerString(actual), String(expected ?? ''));
    case 'starts_with':
      return asLowerString(actual).startsWith(asLowerString(expected));
    case 'ends_with':
      return asLowerString(actual).endsWith(asLowerString(expected));
    case 'exists':
      return actual !== undefined && actual !== null && actual !== '';
    case 'is_empty':
      return actual === undefined || actual === null || actual === '';
    case 'gt':
      return Number(actual) > Number(expected);
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'lt':
      return Number(actual) < Number(expected);
    case 'lte':
      return Number(actual) <= Number(expected);
    case 'in': {
      const list = parseList(expected);
      return list.includes(String(actual ?? ''));
    }
    case 'not_in': {
      const list = parseList(expected);
      return !list.includes(String(actual ?? ''));
    }
    case 'is_true':
      return actual === true || actual === 'true' || actual === 1 || actual === '1';
    case 'is_false':
      return actual === false || actual === 'false' || actual === 0 || actual === '0' || actual == null;
    default:
      return false;
  }
}

/** Backward-compatible single condition */
export function evaluateCondition(
  context: Record<string, unknown>,
  field: string,
  operator: WorkflowConditionOperator | string | undefined,
  expected: string | undefined,
): boolean {
  return evaluateSingleCondition(context, field, operator, expected);
}

export function evaluateConditionGroup(
  context: Record<string, unknown>,
  rules: WorkflowConditionRule[],
  match: 'all' | 'any' = 'all',
): boolean {
  if (!rules.length) return true;
  const results = rules.map((r) =>
    evaluateSingleCondition(context, r.field, r.operator, r.value),
  );
  return match === 'any' ? results.some(Boolean) : results.every(Boolean);
}

const TEMPLATE_PATTERN = /\{\{\s*([^}]+)\s*\}\}/g;

export function renderTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(TEMPLATE_PATTERN, (_match, path: string) => {
    const value = getPathValue(context, path.trim());
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}
