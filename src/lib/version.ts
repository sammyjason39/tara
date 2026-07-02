// ============================================================================
// APP VERSION CONTROL
// ============================================================================
//
// Single source of truth for application version metadata.
// Update this file when releasing new versions.
//
// Versioning follows Semantic Versioning (semver): MAJOR.MINOR.PATCH
// - MAJOR: Breaking changes / major releases
// - MINOR: New features (backward compatible)
// - PATCH: Bug fixes and minor improvements
//
// ============================================================================

export const APP_VERSION = "2.0.0";
export const APP_BUILD_DATE = "2026-06-25";
export const APP_NAME = "TARA";
/** Fallback when branding API is unavailable */
export const APP_COMPANY_FALLBACK = "TARA";
export const APP_COPYRIGHT_YEAR = new Date().getFullYear();

export const VERSION_INFO = {
  version: APP_VERSION,
  name: APP_NAME,
  company: APP_COMPANY_FALLBACK,
  buildDate: APP_BUILD_DATE,
  copyrightYear: APP_COPYRIGHT_YEAR,
} as const;
