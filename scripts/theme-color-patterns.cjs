/**
 * SHARED THEME-COLOR PATTERNS (tooling)
 *
 * Single source of truth for the Hardcoded_Color detection/conversion logic used by
 * the build tooling: the ESLint guard (`eslint-rules/theme-tokens.js`) and the codemod
 * (`scripts/fix-theme-colors.cjs`).
 *
 * This mirrors `isHardcodedColor()` / `convertToThemeColor()` in `src/lib/theme-colors.ts`.
 * That module is the app-facing (TypeScript) source; this `.cjs` module exists because the
 * tooling layer (ESLint flat config + the Node codemod) cannot import the TS module directly.
 * Keep the two in sync when adding palette families or token mappings.
 *
 * A Hardcoded_Color (per the frontend-stabilization spec glossary) is any color expressed
 * directly in markup or styles rather than through a Theme_Token:
 *   - a hex literal (e.g. `#fff`, `#1a2b3c`)
 *   - an rgb()/rgba() or hsl()/hsla() literal with numeric channels (NOT `hsl(var(--token))`)
 *   - a fixed Tailwind palette class (e.g. `text-red-500`, `bg-emerald-100`)
 */

'use strict';

// Tailwind palette color families that are NOT Theme_Tokens.
const PALETTE_FAMILIES = [
  'red', 'rose', 'amber', 'yellow', 'orange', 'emerald', 'green', 'lime', 'teal',
  'blue', 'sky', 'cyan', 'indigo', 'purple', 'violet', 'fuchsia', 'pink',
  'gray', 'zinc', 'neutral', 'slate', 'stone',
];

// Tailwind utility prefixes that accept a color value.
const COLOR_UTILITY_PREFIXES = [
  'text', 'bg', 'border', 'ring', 'ring-offset', 'from', 'via', 'to',
  'fill', 'stroke', 'divide', 'outline', 'shadow', 'decoration', 'accent',
  'caret', 'placeholder',
];

// Palette shades emitted by Tailwind.
const PALETTE_SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

const FAMILY_ALT = PALETTE_FAMILIES.join('|');
const PREFIX_ALT = COLOR_UTILITY_PREFIXES.join('|');
const SHADE_ALT = PALETTE_SHADES.join('|');

// Families that map cleanly onto a semantic Theme_Token. Families omitted here
// (purple, violet, fuchsia, pink, orange, lime, teal) have no canonical token and are
// reported by the lint guard but left untouched by the auto-fix codemod.
const FAMILY_TOKEN = {
  red: 'destructive', rose: 'destructive',
  amber: 'warning', yellow: 'warning',
  emerald: 'success', green: 'success',
  blue: 'primary', indigo: 'primary',
  sky: 'info', cyan: 'info',
  gray: 'muted', zinc: 'muted', neutral: 'muted', slate: 'muted', stone: 'muted',
};

/** Build a fresh palette-class matcher (avoids shared `lastIndex` state with the `g` flag). */
function paletteClassRegex() {
  return new RegExp(`\\b(?:${PREFIX_ALT})-(?:${FAMILY_ALT})-(?:${SHADE_ALT})\\b`, 'g');
}

/** Build a fresh hex-literal matcher (#rgb, #rgba, #rrggbb, #rrggbbaa). */
function hexColorRegex() {
  return /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
}

/** rgb()/rgba() literals, but NOT `rgb(var(--token))` indirection. */
function rgbColorRegex() {
  return /\brgba?\(\s*(?!var\()/g;
}

/** hsl()/hsla() literals, but NOT `hsl(var(--token))` — the canonical Theme_Token form. */
function hslColorRegex() {
  return /\bhsla?\(\s*(?!var\()/g;
}

/**
 * True when the given string contains any Hardcoded_Color (palette class or raw literal).
 * Mirror of `isHardcodedColor()` in `src/lib/theme-colors.ts`, extended to raw literals.
 */
function isHardcodedColor(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  return (
    paletteClassRegex().test(value) ||
    hexColorRegex().test(value) ||
    rgbColorRegex().test(value) ||
    hslColorRegex().test(value)
  );
}

/**
 * Map a single Tailwind palette class to its Theme_Token equivalent, preserving any
 * variant prefixes (e.g. `hover:`, `dark:`, `md:`) and opacity modifier (e.g. `/10`).
 * Returns null when no canonical token mapping exists (caller should leave it as-is).
 * Mirror/extension of `convertToThemeColor()` in `src/lib/theme-colors.ts`.
 */
function mapPaletteClass(className) {
  if (typeof className !== 'string') return null;

  // Split off Tailwind variant prefixes (everything before the final ':').
  const segments = className.split(':');
  const utility = segments[segments.length - 1];
  const variant = segments.slice(0, -1).join(':');

  // Split off an opacity modifier such as `/10`.
  const slashIndex = utility.indexOf('/');
  const base = slashIndex === -1 ? utility : utility.slice(0, slashIndex);
  const opacity = slashIndex === -1 ? '' : utility.slice(slashIndex);

  const match = base.match(new RegExp(`^(${PREFIX_ALT})-(${FAMILY_ALT})-(?:${SHADE_ALT})$`));
  if (!match) return null;

  const prefix = match[1];
  const family = match[2];
  const token = FAMILY_TOKEN[family];
  if (!token) return null;

  // `text-<muted-family>` reads as muted-foreground; everything else keeps its prefix.
  let mappedBase;
  if (token === 'muted' && prefix === 'text') {
    mappedBase = 'text-muted-foreground';
  } else {
    mappedBase = `${prefix}-${token}`;
  }

  const mapped = `${mappedBase}${opacity}`;
  return variant ? `${variant}:${mapped}` : mapped;
}

module.exports = {
  PALETTE_FAMILIES,
  COLOR_UTILITY_PREFIXES,
  PALETTE_SHADES,
  FAMILY_TOKEN,
  paletteClassRegex,
  hexColorRegex,
  rgbColorRegex,
  hslColorRegex,
  isHardcodedColor,
  mapPaletteClass,
};
