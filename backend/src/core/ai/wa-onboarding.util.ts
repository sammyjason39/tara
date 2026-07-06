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

/** Detect short greetings like "Halo Tara", "Hai Tara", "Tara halo", etc. */
export function isTaraGreetingMessage(message: string): boolean {
  const cleaned = message
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || !/\btara\b/i.test(cleaned)) return false;
  if (cleaned.split(/\s+/).length > 8) return false;

  const lower = cleaned.toLowerCase();
  const greetingWords =
    /^(?:halo|hai|hi|hello|hey|helo|hallo|selamat(?:\s+(?:pagi|siang|sore|malam))?|pagi|siang|sore|malam)/;
  const startsWithGreeting = greetingWords.test(lower);
  const startsWithTara = /^tara\b/.test(lower);

  return (
    (startsWithGreeting && /\btara\b/.test(lower)) ||
    (startsWithTara && cleaned.split(/\s+/).length <= 3)
  );
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
