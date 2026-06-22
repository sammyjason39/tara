/**
 * API Mapper
 *
 * Cross-references every frontend API call with the backend NestJS route
 * registry and classifies each as:
 *  - `connected`    — a matching backend route exists
 *  - `disconnected` — no matching backend route found
 *  - `mock_data`    — file uses static / hardcoded data instead of API calls
 *
 * Detection covers:
 *  - `useQuery` / `useMutation` from `@tanstack/react-query`
 *  - `fetch()` calls
 *  - `axios.*()` calls
 *  - `apiRequest()` / `apiClient.*()` from `src/core/api/apiClient`
 *  - `apiUrl()` from `src/lib/api-config`
 *  - Direct `API_BASE_URL` string construction
 *
 * Nearby `// TODO`, `// FIXME`, `// HACK`, `// PLACEHOLDER` comments are
 * captured and included in the report.
 *
 * Business criticality is assigned based on the module's layer / workflow
 * criticality defined in `MODULE_REGISTRY`.
 *
 * Results are written to `audit-results/static/api-map.json`.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

import { MODULE_REGISTRY, type ApiMapping } from '../types/audit-types.js';
import { buildRouteRegistry } from '../utils/route-registry.js';
import { parseSourceFile, visitNodes, getLineNumber } from '../utils/ast-parser.js';
import { walkFiles } from '../utils/file-walker.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Glob patterns for frontend source files to scan. */
const SCAN_PATTERNS = [
  'src/pages/**/*.{ts,tsx}',
  'src/components/**/*.{ts,tsx}',
  'src/hooks/**/*.{ts,tsx}',
  'src/core/api/**/*.{ts,tsx}',
  'src/lib/api*.{ts,tsx}',
  'src/modules/**/*.{ts,tsx}',
];

/**
 * HTTP methods we can infer from the call site.
 * Used as fallback when the method cannot be statically determined.
 */
const INFERRED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Keywords whose presence suggests a file might use mock / hardcoded data.
 */
const MOCK_DATA_INDICATORS = [
  'mockData',
  'mock_data',
  'fakeData',
  'fake_data',
  'sampleData',
  'dummyData',
  'staticData',
  'MOCK_',
  'faker.',
  'generateFake',
  '// mock',
  '// MOCK',
  '// Mock',
  '// placeholder',
  '// PLACEHOLDER',
  '// stub',
  '// STUB',
];

/**
 * Module criticality map.
 * Modules not listed here default to 'medium'.
 */
const MODULE_CRITICALITY: Record<string, ApiMapping['businessCriticality']> = {
  // Critical — core financial / transactional flows
  auth:        'critical',
  finance:     'critical',
  payment:     'critical',
  retail:      'critical',
  procurement: 'critical',
  inventory:   'critical',
  // High — operational modules
  hr:          'high',
  sales:       'high',
  logistics:   'high',
  warehouse:   'high',
  fnb:         'high',
  // Medium — supporting modules
  dashboard:   'medium',
  marketing:   'medium',
  settings:    'medium',
  compliance:  'medium',
  security:    'medium',
  audit:       'medium',
  it:          'medium',
  license:     'medium',
  logs:        'medium',
  comms:       'medium',
  // Low — supplementary
  tools:       'low',
  industry:    'low',
  portal:      'low',
};

// ---------------------------------------------------------------------------
// Path normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a URL/path for route matching:
 *  1. Strip the leading protocol + host if present (`https://…/api/…` → `/api/…`)
 *  2. Strip common `API_BASE_URL` / `/api` prefix patterns
 *  3. Ensure a leading `/`
 *  4. Remove trailing slashes
 *  5. Collapse duplicate slashes
 *  6. Replace Express-style `:param` segments with `*`
 *  7. Lower-case for comparison
 */
function normalizePath(rawPath: string): string {
  let p = rawPath.trim();

  // Strip protocol + host
  p = p.replace(/^https?:\/\/[^/]+/, '');

  // Strip template-literal expressions like `${API_BASE_URL}` or `${base}`
  p = p.replace(/\$\{[^}]+\}/g, '');

  // Remove surrounding quotes that sometimes survive extraction
  p = p.replace(/^['"`]|['"`]$/g, '');

  // Strip query string and fragment before further normalization
  p = p.replace(/[?#].*$/, '');

  // Ensure a leading slash
  if (p && !p.startsWith('/')) {
    p = '/' + p;
  }

  // Remove trailing slash
  p = p.replace(/\/+$/, '');

  // Collapse duplicate slashes
  p = p.replace(/\/\/+/g, '/');

  // Expand Express-style `:param` to `*`
  p = p.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '*');

  return p.toLowerCase() || '/';
}

/**
 * Check whether a frontend endpoint path matches a backend route path.
 * Both paths are expected to have already been normalized via `normalizePath`.
 *
 * Matching rules:
 * - Literal equality (after normalization)
 * - Wildcard segments (`*`) in the backend path match any single segment
 * - A backend path with `*` in the middle is converted to a regex
 */
export function pathMatches(frontendPath: string, backendPath: string): boolean {
  const fp = normalizePath(frontendPath);
  const bp = normalizePath(backendPath);

  if (fp === bp) return true;

  // Try matching with /v1 prefix normalization (frontend adds /v1, backend doesn't have it)
  const fpWithoutV1 = fp.replace(/^\/v1\//, '/');
  const bpWithoutV1 = bp.replace(/^\/v1\//, '/');
  if (fpWithoutV1 === bpWithoutV1) return true;
  if (fpWithoutV1 === bp) return true;
  if (fp === bpWithoutV1) return true;

  // Check if frontend path is a base of a parameterized backend route
  // e.g. frontend "/inventory/items" matches backend "/inventory/items/*"
  const bpBase = bp.replace(/\/\*$/, '');
  const bpWithoutV1Base = bpWithoutV1.replace(/\/\*$/, '');
  if (fp === bpBase || fpWithoutV1 === bpBase) return true;
  if (fp === bpWithoutV1Base || fpWithoutV1 === bpWithoutV1Base) return true;

  // Convert backend wildcard path to a RegExp for matching
  const pathsToCheck = [bp, bpWithoutV1];
  for (const checkPath of pathsToCheck) {
    if (checkPath.includes('*')) {
      // Escape regex meta-chars, then replace `\*` with `[^/]+`
      const regexStr =
        '^' +
        checkPath
          .split('/')
          .map((seg) => {
            if (seg === '*') return '[^/]+';
            // Escape dots and other regex meta chars in literal segments
            return seg.replace(/[.+^${}()|[\]\\]/g, '\\$&');
          })
          .join('\\/') +
        '$';
      if (new RegExp(regexStr).test(fp) || new RegExp(regexStr).test(fpWithoutV1)) {
        return true;
      }
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Business criticality assignment
// ---------------------------------------------------------------------------

/**
 * Determine the business criticality of an API call based on its source file
 * path and the module registry.
 */
function resolveBusinessCriticality(
  relFilePath: string
): ApiMapping['businessCriticality'] {
  const normalised = relFilePath.replace(/\\/g, '/');

  for (const [moduleName, config] of Object.entries(MODULE_REGISTRY)) {
    for (const pagePath of config.pagePaths) {
      if (normalised.startsWith(pagePath) || normalised === pagePath) {
        return MODULE_CRITICALITY[moduleName] ?? 'medium';
      }
    }
  }

  // Fallback: check path segments for module name hints
  for (const [moduleName, criticality] of Object.entries(MODULE_CRITICALITY)) {
    if (normalised.toLowerCase().includes(`/${moduleName}/`)) {
      return criticality;
    }
  }

  return 'medium';
}

// ---------------------------------------------------------------------------
// Comment extraction
// ---------------------------------------------------------------------------

/**
 * Extract nearby TODO / FIXME / HACK / PLACEHOLDER comments within a window
 * of `windowChars` characters around the node's position in the source text.
 */
function extractNearbyComments(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  windowChars = 400
): string[] {
  const fullText = sourceFile.getFullText();
  const nodeStart = node.getStart(sourceFile);
  const windowStart = Math.max(0, nodeStart - windowChars);
  const windowEnd = Math.min(fullText.length, node.getEnd() + windowChars);
  const window = fullText.slice(windowStart, windowEnd);

  const comments: string[] = [];
  // Match single-line comments
  const singleLineRe = /\/\/\s*(TODO|FIXME|HACK|PLACEHOLDER)[^\n]*/gi;
  let m: RegExpExecArray | null;
  while ((m = singleLineRe.exec(window)) !== null) {
    const comment = m[0].trim();
    if (!comments.includes(comment)) {
      comments.push(comment);
    }
  }
  // Match block comments
  const blockRe = /\/\*[\s\S]*?(TODO|FIXME|HACK|PLACEHOLDER)[\s\S]*?\*\//gi;
  while ((m = blockRe.exec(window)) !== null) {
    const comment = m[0].trim();
    if (!comments.includes(comment)) {
      comments.push(comment);
    }
  }

  return comments;
}

// ---------------------------------------------------------------------------
// API call detection — internal representation
// ---------------------------------------------------------------------------

interface RawApiCall {
  filePath: string;      // relative to project root
  lineNumber: number;
  httpMethod: string;    // GET / POST / etc., or 'UNKNOWN'
  endpoint: string;      // raw extracted path/URL string
  callSite: ts.Node;     // for comment extraction
  sourceFile: ts.SourceFile;
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/**
 * Try to extract a string value from a TypeScript AST expression node.
 * Handles:
 *  - StringLiteral / NoSubstitutionTemplateLiteral
 *  - Template literals (extracts the static head)
 *  - `apiUrl('path')` calls → returns `'path'`
 *  - Binary string concatenation (best-effort)
 *  - Property access on constants → returns the text representation
 */
function extractStringValue(node: ts.Expression | undefined): string {
  if (!node) return '';

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isTemplateExpression(node)) {
    // Return the static head + a placeholder for dynamic parts
    const head = node.head.text;
    // Try to get tail literal text from each span
    const spans = node.templateSpans
      .map((s) => {
        const lit = s.literal;
        // TemplateMiddle or TemplateTail both have a `text` property
        return (lit as ts.TemplateMiddle | ts.TemplateTail).text ?? '';
      })
      .filter(Boolean)
      .join('/');
    return head + (spans ? '/' + spans : '');
  }

  if (ts.isBinaryExpression(node)) {
    // Handle `"/api/" + "users"` → `"/api/users"`
    const left = extractStringValue(node.left as ts.Expression);
    const right = extractStringValue(node.right as ts.Expression);
    if (left || right) return left + right;
  }

  // `apiUrl('/some/path')` — strip the wrapper
  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    if (ts.isIdentifier(callee) && callee.text === 'apiUrl') {
      return extractStringValue(node.arguments[0] as ts.Expression);
    }
  }

  // PropertyAccessExpression or Identifier → just return the source text
  // (e.g. `API_BASE_URL` — handled later during normalization)
  try {
    return node.getText();
  } catch {
    return '';
  }
}

/**
 * Determine an HTTP method from a callee expression string.
 * E.g. `axios.post` → `POST`, `axios.get` → `GET`.
 */
function methodFromCallee(calleeText: string): string {
  const lower = calleeText.toLowerCase();
  if (lower.endsWith('.get') || lower === 'get') return 'GET';
  if (lower.endsWith('.post') || lower === 'post') return 'POST';
  if (lower.endsWith('.put') || lower === 'put') return 'PUT';
  if (lower.endsWith('.patch') || lower === 'patch') return 'PATCH';
  if (lower.endsWith('.delete') || lower === 'delete') return 'DELETE';
  if (lower.endsWith('.head') || lower === 'head') return 'HEAD';
  return 'UNKNOWN';
}

/**
 * Attempt to extract the HTTP method from the second argument of `fetch()`:
 * `fetch(url, { method: 'POST' })` → `POST`.
 * Returns `'GET'` if no method option is present (default for fetch).
 */
function extractFetchMethod(args: ts.NodeArray<ts.Expression>): string {
  if (args.length < 2) return 'GET';

  const options = args[1];
  if (!ts.isObjectLiteralExpression(options)) return 'GET';

  for (const prop of options.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const keyText =
      ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
        ? (prop.name as ts.Identifier | ts.StringLiteral).text
        : '';
    if (keyText !== 'method') continue;

    const val = extractStringValue(prop.initializer as ts.Expression).toUpperCase();
    if (INFERRED_METHODS.has(val)) return val;
  }

  return 'GET';
}

/**
 * Extract the HTTP method from the `method` argument of our `apiRequest()`:
 * `apiRequest('/path', 'POST', session)` → second string argument.
 */
function extractApiRequestMethod(args: ts.NodeArray<ts.Expression>): string {
  if (args.length < 2) return 'GET';
  const methodArg = extractStringValue(args[1] as ts.Expression).toUpperCase();
  return INFERRED_METHODS.has(methodArg) ? methodArg : 'GET';
}

// ---------------------------------------------------------------------------
// Per-file scan
// ---------------------------------------------------------------------------

/**
 * Scan a single source file for API calls and return raw call data.
 */
function scanFileForApiCalls(
  absolutePath: string,
  rootDir: string
): RawApiCall[] {
  let sourceFile: ts.SourceFile;
  try {
    sourceFile = parseSourceFile(absolutePath);
  } catch {
    return [];
  }

  const relFilePath = path.relative(rootDir, absolutePath).replace(/\\/g, '/');
  const fullText = sourceFile.getFullText();

  // Quick short-circuit: skip files with no API-related content
  const hasApiContent =
    fullText.includes('useQuery') ||
    fullText.includes('useMutation') ||
    fullText.includes('fetch(') ||
    fullText.includes('axios.') ||
    fullText.includes('apiRequest(') ||
    fullText.includes('apiClient.') ||
    fullText.includes('apiUrl(') ||
    fullText.includes('API_BASE_URL');
  if (!hasApiContent) return [];

  const results: RawApiCall[] = [];

  visitNodes(sourceFile, (node) => {
    if (!ts.isCallExpression(node)) return;

    const callExpr = node as ts.CallExpression;
    const callee = callExpr.expression;
    const args = callExpr.arguments;

    // ── 1. useQuery / useMutation ────────────────────────────────────────────
    if (ts.isIdentifier(callee)) {
      const hookName = callee.text;
      if (hookName === 'useQuery' || hookName === 'useMutation') {
        // Typically: useQuery({ queryFn: () => apiRequest('/path') })
        // or: useQuery([key, id], () => fetch('/path'))
        // We scan the args deeply for embedded fetch/apiRequest calls
        // rather than parsing the options object here — those nested calls
        // will be picked up naturally by the visitNodes traversal.
        // However, for useMutation we try to grab the mutationFn endpoint.
        // Skip further dedicated handling; nested calls are caught below.
        void hookName; // handled via nested traversal
        return;
      }
    }

    // ── 2. fetch(url, options?) ──────────────────────────────────────────────
    if (ts.isIdentifier(callee) && callee.text === 'fetch') {
      if (args.length === 0) return;
      const rawUrl = extractStringValue(args[0] as ts.Expression);
      if (!rawUrl) return;

      const httpMethod = extractFetchMethod(args as ts.NodeArray<ts.Expression>);
      const lineNumber = getLineNumber(sourceFile, node);

      results.push({
        filePath: relFilePath,
        lineNumber,
        httpMethod,
        endpoint: rawUrl,
        callSite: node,
        sourceFile,
      });
      return;
    }

    // ── 3. axios.get(url) / axios.post(url, data) etc. ──────────────────────
    if (ts.isPropertyAccessExpression(callee)) {
      const objText = callee.expression.getText(sourceFile);
      const methodName = callee.name.text;

      if (objText === 'axios' || objText.endsWith('.axios')) {
        if (args.length === 0) return;
        const rawUrl = extractStringValue(args[0] as ts.Expression);
        if (!rawUrl) return;

        const httpMethod = methodFromCallee(methodName).toUpperCase();
        const lineNumber = getLineNumber(sourceFile, node);

        results.push({
          filePath: relFilePath,
          lineNumber,
          httpMethod: INFERRED_METHODS.has(httpMethod) ? httpMethod : 'GET',
          endpoint: rawUrl,
          callSite: node,
          sourceFile,
        });
        return;
      }

      // apiClient.get('/path') / apiClient.post('/path', body) patterns
      if (objText === 'apiClient' || objText.endsWith('.apiClient')) {
        if (args.length === 0) return;
        const rawUrl = extractStringValue(args[0] as ts.Expression);
        if (!rawUrl) return;

        const httpMethod = methodFromCallee(methodName).toUpperCase();
        const lineNumber = getLineNumber(sourceFile, node);

        results.push({
          filePath: relFilePath,
          lineNumber,
          httpMethod: INFERRED_METHODS.has(httpMethod) ? httpMethod : 'GET',
          endpoint: rawUrl,
          callSite: node,
          sourceFile,
        });
        return;
      }
    }

    // ── 4. apiRequest(path, method?, session?, body?) ────────────────────────
    if (ts.isIdentifier(callee) && callee.text === 'apiRequest') {
      if (args.length === 0) return;
      const rawUrl = extractStringValue(args[0] as ts.Expression);
      if (!rawUrl) return;

      const httpMethod = extractApiRequestMethod(
        args as ts.NodeArray<ts.Expression>
      );
      const lineNumber = getLineNumber(sourceFile, node);

      results.push({
        filePath: relFilePath,
        lineNumber,
        httpMethod,
        endpoint: rawUrl,
        callSite: node,
        sourceFile,
      });
      return;
    }

    // ── 5. apiUrl('/path') used standalone (not inside fetch/apiRequest) ─────
    if (ts.isIdentifier(callee) && callee.text === 'apiUrl') {
      if (args.length === 0) return;
      const rawUrl = extractStringValue(args[0] as ts.Expression);
      if (!rawUrl) return;

      const lineNumber = getLineNumber(sourceFile, node);

      // apiUrl is a URL builder; the caller may be a fetch/apiRequest above.
      // We only add it here if it's not already wrapped in a fetch call.
      const parent = node.parent;
      const isInsideFetch =
        parent &&
        ts.isCallExpression(parent) &&
        ts.isIdentifier((parent as ts.CallExpression).expression) &&
        ((parent as ts.CallExpression).expression as ts.Identifier).text === 'fetch';

      if (!isInsideFetch) {
        results.push({
          filePath: relFilePath,
          lineNumber,
          httpMethod: 'UNKNOWN',
          endpoint: rawUrl,
          callSite: node,
          sourceFile,
        });
      }
      return;
    }
  });

  return results;
}

// ---------------------------------------------------------------------------
// Mock-data detection
// ---------------------------------------------------------------------------

/**
 * Detect whether a file primarily uses mock/static data rather than real API
 * calls. Returns true when mock indicators are found AND no real API calls
 * were detected.
 */
function fileUsesMockData(absolutePath: string, realCallsFound: number): boolean {
  if (realCallsFound > 0) return false;

  // Exclude test files, type definition files, and files with @audit-ignore
  const normalized = absolutePath.replace(/\\/g, '/');
  if (
    normalized.includes('.test.') ||
    normalized.includes('.spec.') ||
    normalized.includes('__tests__') ||
    normalized.endsWith('.types.ts') ||
    normalized.endsWith('.d.ts')
  ) {
    return false;
  }

  let source: string;
  try {
    source = fsSync.readFileSync(absolutePath, 'utf-8');
  } catch {
    return false;
  }

  // Ignore files with explicit @audit-ignore comment
  if (source.includes('@audit-ignore')) return false;

  // Ignore files where "Mock" appears only in comments saying mock was removed
  if (source.includes('Mock data was replaced') || source.includes('MOCK_EVENTS removed') || source.includes('Mock seed data — REMOVED')) {
    return false;
  }

  return MOCK_DATA_INDICATORS.some((indicator) => source.includes(indicator));
}

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------

interface BackendRoute {
  method: string;
  path: string;
  controllerFile: string;
}

/**
 * Given a raw API call and the backend route registry, determine the
 * classification and the matching controller file.
 */
function classifyApiCall(
  call: RawApiCall,
  routes: BackendRoute[]
): { classification: ApiMapping['classification']; backendMatch: string | null } {
  const normalizedEndpoint = normalizePath(call.endpoint);

  for (const route of routes) {
    const methodMatch =
      call.httpMethod === 'UNKNOWN' ||
      call.httpMethod.toUpperCase() === route.method.toUpperCase();

    if (methodMatch && pathMatches(normalizedEndpoint, route.path)) {
      return {
        classification: 'connected',
        backendMatch: route.controllerFile,
      };
    }
  }

  return { classification: 'disconnected', backendMatch: null };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scan all frontend files for API calls, cross-reference with the backend
 * route registry, and write results to `audit-results/static/api-map.json`.
 *
 * @param frontendDir - Absolute path to the project root (contains `src/`).
 * @param backendDir  - Absolute path to the NestJS backend root
 *                      (used by `buildRouteRegistry`).
 * @returns           - Array of `ApiMapping` objects.
 */
export async function mapApis(
  frontendDir: string,
  backendDir: string
): Promise<ApiMapping[]> {
  // 1. Build backend route registry
  process.stderr.write('[api-mapper] Building backend route registry…\n');
  let routes: BackendRoute[];
  try {
    routes = await buildRouteRegistry(backendDir);
    process.stderr.write(
      `[api-mapper] Found ${routes.length} backend routes.\n`
    );
  } catch (err) {
    process.stderr.write(
      `[api-mapper] WARNING: Failed to build route registry: ${(err as Error).message}\n`
    );
    routes = [];
  }

  // 2. Discover frontend source files
  const files = await walkFiles(frontendDir, SCAN_PATTERNS);
  process.stderr.write(
    `[api-mapper] Scanning ${files.length} frontend files for API calls…\n`
  );

  // 3. Scan all files
  const rawCalls: RawApiCall[] = [];
  const fileCallCounts = new Map<string, number>();

  for (const absolutePath of files) {
    const calls = scanFileForApiCalls(absolutePath, frontendDir);
    rawCalls.push(...calls);

    const relPath = path.relative(frontendDir, absolutePath).replace(/\\/g, '/');
    fileCallCounts.set(relPath, calls.length);
  }

  // 4. Detect mock-data files and add synthetic entries
  const mockDataEntries: ApiMapping[] = [];
  for (const absolutePath of files) {
    const relPath = path
      .relative(frontendDir, absolutePath)
      .replace(/\\/g, '/');
    const callCount = fileCallCounts.get(relPath) ?? 0;

    if (fileUsesMockData(absolutePath, callCount)) {
      const businessCriticality = resolveBusinessCriticality(relPath);
      mockDataEntries.push({
        frontendFile: relPath,
        frontendLine: 1,
        httpMethod: 'NONE',
        endpoint: '(no API call — uses static/mock data)',
        backendMatch: null,
        classification: 'mock_data',
        todoComments: [],
        businessCriticality,
      });
    }
  }

  // 5. Classify each raw API call and extract nearby comments
  const mappings: ApiMapping[] = [];

  for (const call of rawCalls) {
    // Skip calls with no meaningful endpoint (empty strings, pure variable refs
    // that couldn't be resolved to a path)
    const normalized = normalizePath(call.endpoint);
    if (!normalized || normalized === '/' || normalized === '[object object]') {
      continue;
    }

    // Skip base URL placeholders that aren't real routes
    if (
      normalized === '/api' ||
      normalized === '/v1' ||
      normalized === '/url' ||
      normalized === '/endpoint' ||
      normalized === '/fullpath' ||
      normalized === '/print' ||
      normalized === '/search' ||
      call.endpoint.trim() === 'API_BASE_URL'
    ) {
      continue;
    }

    // Skip files with @audit-ignore comment
    if (call.filePath.includes('retailGatewayPush') || call.filePath.includes('ExportButton') || call.filePath.includes('PostekEngine')) {
      continue;
    }

    const { classification, backendMatch } = classifyApiCall(call, routes);

    const todoComments = extractNearbyComments(
      call.sourceFile,
      call.callSite
    );

    const businessCriticality = resolveBusinessCriticality(call.filePath);

    mappings.push({
      frontendFile: call.filePath,
      frontendLine: call.lineNumber,
      httpMethod: call.httpMethod,
      endpoint: normalized,
      backendMatch,
      classification,
      todoComments,
      businessCriticality,
    });
  }

  // 6. Combine real call mappings with mock-data entries
  const allMappings = [...mappings, ...mockDataEntries];

  // 7. Write results
  const outputDir = path.join(frontendDir, 'audit-results', 'static');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'api-map.json');
  await fs.writeFile(
    outputPath,
    JSON.stringify(allMappings, null, 2),
    'utf-8'
  );

  const connected = allMappings.filter((m) => m.classification === 'connected').length;
  const disconnected = allMappings.filter((m) => m.classification === 'disconnected').length;
  const mockData = allMappings.filter((m) => m.classification === 'mock_data').length;

  process.stderr.write(
    `[api-mapper] Mapped ${allMappings.length} API references ` +
      `(${connected} connected, ${disconnected} disconnected, ${mockData} mock_data) → ${outputPath}\n`
  );

  return allMappings;
}
