import {
  TARA_DOCS_MEMULAI_URL,
  TARA_LOGIN_URL,
} from './ai.interfaces';

export interface WaFirstLoginWelcomeParams {
  fullName: string;
  email: string;
  employeeCode?: string;
  temporaryPassword: string | null;
}

/** Detect casual openers that should start the first-login WA onboarding flow. */
export function isCasualOnboardingMessage(message: string): boolean {
  const cleaned = message
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return false;
  if (cleaned.length > 48) return false;

  const lower = cleaned.toLowerCase();
  const wordCount = lower.split(/\s+/).length;
  if (wordCount > 6) return false;

  const casualOpener =
    /^(?:halo|halau|hai|hi|hello|hey|helo|hallo|test|tes|ping|p|ok|oke|okay|yoi|hola|hallo|assalamualaikum|asalamualaikum|ass?alam|pagi|siang|sore|malam|selamat(?:\s+(?:pagi|siang|sore|malam))?)$/i;
  if (casualOpener.test(lower)) return true;

  if (!/\btara\b/i.test(cleaned)) return false;

  const greetingWords =
    /^(?:halo|hai|hi|hello|hey|helo|hallo|selamat(?:\s+(?:pagi|siang|sore|malam))?|pagi|siang|sore|malam)/;
  const startsWithGreeting = greetingWords.test(lower);
  const startsWithTara = /^tara\b/.test(lower);

  return (
    (startsWithGreeting && /\btara\b/.test(lower)) ||
    (startsWithTara && wordCount <= 3)
  );
}

/** @deprecated Use isCasualOnboardingMessage */
export function isTaraGreetingMessage(message: string): boolean {
  return isCasualOnboardingMessage(message);
}

export function buildFirstLoginWelcomeMessage(params: WaFirstLoginWelcomeParams): string {
  const firstName = params.fullName.trim().split(/\s+/)[0] || params.fullName;
  const usernameLine = params.employeeCode
    ? `👤 Username: ${params.email}\n   (atau kode karyawan: ${params.employeeCode})`
    : `👤 Username: ${params.email}`;

  const passwordBlock = params.temporaryPassword
    ? `🔑 Password sementara: *${params.temporaryPassword}*`
    : `🔑 Password: sudah diset khusus oleh HR. Jika belum menerimanya, hubungi HR Admin.`;

  return (
    `Halo, *${firstName}*! 👋\n\n` +
    `Selamat datang di TARA. Sepertinya Anda *belum pernah login* ke aplikasi kami.\n\n` +
    `*Login pertama kali:*\n` +
    `🔗 ${TARA_LOGIN_URL}\n\n` +
    `*Akun Anda:*\n` +
    `📧 Email: ${params.email}\n` +
    `${usernameLine}\n` +
    `${passwordBlock}\n\n` +
    `📚 Panduan lengkap:\n` +
    `${TARA_DOCS_MEMULAI_URL}\n\n` +
    `⚠️ Saat login pertama kali, Anda akan diminta *mengganti password* demi keamanan akun.\n\n` +
    `Silakan login dulu, lalu chat TARA lagi jika butuh bantuan absensi, cuti, atau kebijakan perusahaan.`
  );
}

export interface WaPasswordResetParams {
  fullName: string;
  email: string;
  newPassword: string;
}

export function buildPasswordResetMessage(params: WaPasswordResetParams): string {
  const firstName = params.fullName.trim().split(/\s+/)[0] || params.fullName;
  return (
    `Halo, *${firstName}*!\n\n` +
    `Password akun TARA Anda telah *direset* oleh HR Admin.\n\n` +
    `*Login:*\n` +
    `🔗 ${TARA_LOGIN_URL}\n\n` +
    `*Akun Anda:*\n` +
    `📧 Email: ${params.email}\n` +
    `🔑 Password baru: *${params.newPassword}*\n\n` +
    `⚠️ Demi keamanan, *wajib ganti password* saat login berikutnya.\n\n` +
    `Jika Anda tidak meminta reset ini, segera hubungi HR Admin.`
  );
}
