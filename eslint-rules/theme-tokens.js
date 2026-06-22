/**
 * ESLint guard plugin: theme-token enforcement (frontend-stabilization Phase 0).
 *
 * Provides two rules that make the Design_System's Theme_Token requirement enforceable
 * (Requirements 7.1, 8.4, 5.2, 1.7):
 *
 *   - `theme-tokens/no-hardcoded-colors`
 *       Flags Hardcoded_Color usage: hex / rgb() / hsl() literals (excluding the canonical
 *       `hsl(var(--token))` form) and fixed Tailwind palette classes (e.g. `text-red-500`,
 *       `bg-emerald-100`). Built on the shared patterns that mirror `isHardcodedColor()` /
 *       `convertToThemeColor()` from `src/lib/theme-colors.ts`.
 *
 *   - `theme-tokens/no-mock-data-import`
 *       Flags imports from `@/lib/mock-data` so production Pages bind Real_Data and never
 *       surface Placeholder_Data (Requirements 5.2). Scoped to Pages via the flat config.
 *
 * The flat config wires these as warnings during stabilization so they surface the intended
 * patterns without inflating the pre-existing error baseline; they can be elevated to errors
 * once the per-phase page cleanup lands (task 18.1).
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const patterns = require('../scripts/theme-color-patterns.cjs');

const MOCK_DATA_MODULE = '@/lib/mock-data';

/**
 * Scan a raw string for Hardcoded_Color usage and return human-readable findings.
 * @param {string} value
 * @returns {string[]} messages describing each kind of violation found
 */
function findHardcodedColors(value) {
  if (typeof value !== 'string' || value.length === 0) return [];
  const findings = [];

  const classMatches = value.match(patterns.paletteClassRegex());
  if (classMatches) {
    for (const cls of [...new Set(classMatches)]) {
      const suggestion = patterns.mapPaletteClass(cls);
      findings.push(
        suggestion
          ? `Hardcoded Tailwind palette class "${cls}" — use the Theme_Token class "${suggestion}" instead.`
          : `Hardcoded Tailwind palette class "${cls}" — replace with a Theme_Token class.`,
      );
    }
  }

  if (patterns.hexColorRegex().test(value)) {
    findings.push('Hardcoded hex color literal — derive the color from a Theme_Token.');
  }
  if (patterns.rgbColorRegex().test(value)) {
    findings.push('Hardcoded rgb()/rgba() color literal — derive the color from a Theme_Token.');
  }
  if (patterns.hslColorRegex().test(value)) {
    findings.push(
      'Hardcoded hsl()/hsla() color literal — use a Theme_Token via hsl(var(--token)).',
    );
  }

  return findings;
}

/** @type {import('eslint').Rule.RuleModule} */
const noHardcodedColors = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Hardcoded_Color usage (hex/rgb/hsl literals and fixed Tailwind palette classes); use Theme_Tokens instead.',
    },
    schema: [],
    messages: {
      hardcoded: '{{ detail }}',
    },
  },
  create(context) {
    function report(node, value) {
      for (const detail of findHardcodedColors(value)) {
        context.report({ node, messageId: 'hardcoded', data: { detail } });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          report(node, node.value);
        }
      },
      TemplateElement(node) {
        const raw = node.value && node.value.cooked;
        if (typeof raw === 'string') {
          report(node, raw);
        }
      },
    };
  },
};

/** @type {import('eslint').Rule.RuleModule} */
const noMockDataImport = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow importing @/lib/mock-data from production Pages so views bind Real_Data, not Placeholder_Data.',
    },
    schema: [],
    messages: {
      mockData:
        'Production code must not import "{{ source }}" (Placeholder_Data). Bind Real_Data from the Backend_API and use @/lib/format for formatting helpers.',
    },
  },
  create(context) {
    function check(node, source) {
      if (source === MOCK_DATA_MODULE) {
        context.report({ node, messageId: 'mockData', data: { source } });
      }
    }
    return {
      ImportDeclaration(node) {
        check(node, node.source.value);
      },
      // Covers `export { x } from '@/lib/mock-data'` re-exports.
      ExportNamedDeclaration(node) {
        if (node.source) check(node, node.source.value);
      },
      ExportAllDeclaration(node) {
        if (node.source) check(node, node.source.value);
      },
      // Covers dynamic `import('@/lib/mock-data')` and `require('@/lib/mock-data')`.
      ImportExpression(node) {
        if (node.source && node.source.type === 'Literal') check(node, node.source.value);
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal'
        ) {
          check(node, node.arguments[0].value);
        }
      },
    };
  },
};

const plugin = {
  meta: { name: 'theme-tokens' },
  rules: {
    'no-hardcoded-colors': noHardcodedColors,
    'no-mock-data-import': noMockDataImport,
  },
};

export default plugin;
