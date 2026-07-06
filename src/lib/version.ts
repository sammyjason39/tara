// ============================================================================
// APP VERSION CONTROL — see /VERSION (A.B.C)
// ============================================================================
//
// A = major platform (generasi produk besar, saat ini: 2)
// B = upgrade mayor (UI masif, fitur besar, perubahan signifikan)
// C = minor (bug fix, hotfix, penyesuaian kecil)
//
// Jangan edit manual — gunakan scripts/bump-version.sh + sync-version.sh
// Production deploy otomatis bump C (patch) dan commit tag vA.B.C
//
// ============================================================================

export const APP_VERSION = "2.0.6";
export const APP_BUILD_DATE = "2026-07-06";
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
