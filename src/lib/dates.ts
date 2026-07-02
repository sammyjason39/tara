import { format, isValid, parse } from "date-fns";
import { id } from "date-fns/locale";

/** Format tampilan standar Indonesia */
export const DISPLAY_DATE_FORMAT = "dd/MM/yyyy";
export const API_DATE_FORMAT = "yyyy-MM-dd";

const DISPLAY_DATE_PATTERN = /^\d{2}[/-]\d{2}[/-]\d{4}$/;
const API_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

export function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;

  const str = String(value).trim();
  if (API_DATE_PATTERN.test(str)) {
    const parsed = parse(str.slice(0, 10), API_DATE_FORMAT, new Date());
    return isValid(parsed) ? parsed : null;
  }
  if (DISPLAY_DATE_PATTERN.test(str)) {
    const normalized = str.replace(/-/g, "/");
    const parsed = parse(normalized, DISPLAY_DATE_FORMAT, new Date());
    return isValid(parsed) ? parsed : null;
  }

  const fallback = new Date(str);
  return isValid(fallback) ? fallback : null;
}

export function formatDate(value: string | Date | null | undefined, fallback = "—"): string {
  const date = toDate(value);
  if (!date) return fallback;
  return format(date, DISPLAY_DATE_FORMAT);
}

export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  fallback = "—",
): string {
  const startLabel = formatDate(start, "");
  const endLabel = formatDate(end, "");
  if (!startLabel && !endLabel) return fallback;
  if (startLabel && endLabel) return `${startLabel} — ${endLabel}`;
  return startLabel || endLabel;
}

export function formatDateLong(value: string | Date | null | undefined, fallback = "—"): string {
  const date = toDate(value);
  if (!date) return fallback;
  return format(date, "EEEE, d MMMM yyyy", { locale: id });
}

export function formatDateWithWeekday(
  value: string | Date | null | undefined,
  fallback = "—",
): string {
  const date = toDate(value ?? new Date());
  if (!date) return fallback;
  const weekday = format(date, "EEEE", { locale: id });
  return `${weekday}, ${format(date, DISPLAY_DATE_FORMAT)}`;
}

export function formatDateTime(value: string | Date | null | undefined, fallback = "—"): string {
  const date = toDate(value);
  if (!date) return fallback;
  return format(date, `${DISPLAY_DATE_FORMAT} HH:mm`, { locale: id });
}

export function toApiDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return format(date, API_DATE_FORMAT);
}

export function todayApiDate(): string {
  return format(new Date(), API_DATE_FORMAT);
}

export function parseDisplayDateToApi(value: string): string | null {
  const api = toApiDate(value);
  return api || null;
}
