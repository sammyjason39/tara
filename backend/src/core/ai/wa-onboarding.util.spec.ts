import {
  buildFirstLoginWelcomeMessage,
  isCasualOnboardingMessage,
  isTaraGreetingMessage,
} from './wa-onboarding.util';

describe('isCasualOnboardingMessage', () => {
  it.each([
    'Halo Tara',
    'halo tara',
    'Hai Tara!',
    'Hi Tara',
    'Selamat pagi Tara',
    'Tara halo',
    'Tara',
    'Halo Tara,',
    'halo',
    'Halo',
    'halau',
    'hai',
    'test',
    'tes',
    'p',
    'ping',
    'ok',
    'oke',
    'selamat pagi',
  ])('matches casual opener: %s', (msg) => {
    expect(isCasualOnboardingMessage(msg)).toBe(true);
  });

  it.each([
    'Saya mau cuti besok',
    'Tara tolong ajukan cuti',
    'Tolong bantu ajukan cuti tahun depan untuk liburan keluarga',
    '',
  ])('does not match substantive message: %s', (msg) => {
    expect(isCasualOnboardingMessage(msg)).toBe(false);
  });
});

describe('isTaraGreetingMessage', () => {
  it('delegates to isCasualOnboardingMessage for Tara greetings', () => {
    expect(isTaraGreetingMessage('Halo Tara')).toBe(true);
    expect(isTaraGreetingMessage('halo')).toBe(true);
  });
});

describe('buildFirstLoginWelcomeMessage', () => {
  it('includes login link, credentials, docs, and password change note', () => {
    const msg = buildFirstLoginWelcomeMessage({
      fullName: 'Budi Santoso',
      email: 'budi@ralali.com',
      employeeCode: 'EMP-001',
      temporaryPassword: 'demo123',
    });

    expect(msg).toContain('Halo, *Budi*!');
    expect(msg).toContain('belum pernah login');
    expect(msg).toContain('https://tara.ralali.io/login');
    expect(msg).toContain('budi@ralali.com');
    expect(msg).toContain('EMP-001');
    expect(msg).toContain('*demo123*');
    expect(msg).toContain('/docs/employee/memulai');
    expect(msg).toContain('mengganti password');
  });
});
