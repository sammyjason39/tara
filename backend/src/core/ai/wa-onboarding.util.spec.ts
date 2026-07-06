import {
  buildFirstLoginWelcomeMessage,
  isTaraGreetingMessage,
} from './wa-onboarding.util';

describe('isTaraGreetingMessage', () => {
  it.each([
    'Halo Tara',
    'halo tara',
    'Hai Tara!',
    'Hi Tara',
    'Selamat pagi Tara',
    'Tara halo',
    'Tara',
    'Halo Tara,',
  ])('matches greeting: %s', (msg) => {
    expect(isTaraGreetingMessage(msg)).toBe(true);
  });

  it.each([
    'Saya mau cuti besok',
    'Tara tolong ajukan cuti',
    'Halo semua',
    '',
  ])('does not match: %s', (msg) => {
    expect(isTaraGreetingMessage(msg)).toBe(false);
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
    expect(msg).toContain('/docs/memulai');
    expect(msg).toContain('mengganti password');
  });
});
