import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  evaluateConditionGroup,
  evaluateSingleCondition,
  renderTemplate,
  buildExpressionContext,
} from './workflow-expression.util';

describe('workflow-expression.util', () => {
  const event = {
    event_type: 'whatsapp.message.inbound',
    payload: { content: 'Saya mau resign bulan depan', employee_name: 'Budi' },
    actor: { id: 'emp-1', type: 'employee' },
    entity: { id: 'msg-1', type: 'whatsapp_message' },
  };

  const enriched = {
    ...buildExpressionContext(event),
    employee: { role: 'Supervisor', department: 'IT', full_name: 'Budi' },
    supervisor: { role: 'HR_Admin', full_name: 'Sari' },
  };

  it('evaluates contains condition', () => {
    expect(evaluateCondition(enriched, 'payload.content', 'contains', 'resign')).toBe(true);
  });

  it('contains_word matches whole words only', () => {
    expect(evaluateSingleCondition(enriched, 'payload.content', 'contains_word', 'resign')).toBe(
      true,
    );
    expect(
      evaluateSingleCondition(
        { payload: { content: 'Tolong memberhentikan proses cuti saya' } },
        'payload.content',
        'contains_word',
        'berhenti',
      ),
    ).toBe(false);
    expect(
      evaluateSingleCondition(
        { payload: { content: 'Saya mau berhenti kerja' } },
        'payload.content',
        'contains_word',
        'berhenti',
      ),
    ).toBe(true);
    expect(
      evaluateSingleCondition(
        { payload: { content: 'Bagaimana cara presign dokumen?' } },
        'payload.content',
        'contains_word',
        'resign',
      ),
    ).toBe(false);
    expect(
      evaluateSingleCondition(
        { payload: { content: 'Berapa sisa cuti saya?' } },
        'payload.content',
        'contains_word',
        'resign',
      ),
    ).toBe(false);
  });

  it('evaluates employee role', () => {
    expect(evaluateSingleCondition(enriched, 'employee.role', 'eq', 'Supervisor')).toBe(true);
    expect(evaluateSingleCondition(enriched, 'employee.role', 'in', 'Employee,Supervisor')).toBe(true);
  });

  it('evaluates condition group with any', () => {
    expect(
      evaluateConditionGroup(
        enriched,
        [
          { field: 'employee.role', operator: 'eq', value: 'Employee' },
          { field: 'employee.department', operator: 'eq', value: 'IT' },
        ],
        'any',
      ),
    ).toBe(true);
  });

  it('renders template variables from employee', () => {
    expect(renderTemplate('Role: {{employee.role}}', enriched)).toBe('Role: Supervisor');
  });
});
