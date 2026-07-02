import { describe, expect, it } from 'vitest';
import {
  extractClaimedNameFromMessage,
  filterIdentityUnsafeMemories,
  wrapUserMessageWithIdentity,
} from './employee-identity.util';
import { EmployeeAiContext } from './ai.interfaces';

const ctx: EmployeeAiContext = {
  id: 'emp-1',
  employee_code: 'EMP001',
  full_name: 'Samuel Jason',
  email: 'samuel@conextlab.ai',
  role_name: 'SuperAdmin',
  department_name: 'IT',
  is_supervisor: false,
  is_hr_admin: true,
};

describe('employee-identity.util', () => {
  it('extracts claimed name from user message', () => {
    expect(extractClaimedNameFromMessage('Halo, nama saya Joko')).toBe('Joko');
    expect(extractClaimedNameFromMessage('panggil saya Budi ya')).toBe('Budi ya');
  });

  it('filters memories that contradict official identity', () => {
    const memories = [
      'Karyawan meminta dipanggil Joko',
      'Suka mengajukan cuti di akhir bulan',
      'Nama resmi Samuel Jason sudah dikonfirmasi',
    ];
    const filtered = filterIdentityUnsafeMemories(memories, 'Samuel Jason');
    expect(filtered).toContain('Suka mengajukan cuti di akhir bulan');
    expect(filtered).toContain('Nama resmi Samuel Jason sudah dikonfirmasi');
    expect(filtered).not.toContain('Karyawan meminta dipanggil Joko');
  });

  it('wraps user message with authenticated DB identity', () => {
    const wrapped = wrapUserMessageWithIdentity(ctx, 'nama saya joko');
    expect(wrapped).toContain('Samuel Jason');
    expect(wrapped).toContain('NIK: EMP001');
    expect(wrapped).toContain('ABAIKAN');
    expect(wrapped).toContain('joko');
    expect(wrapped).toContain('[Pesan user]');
  });
});
