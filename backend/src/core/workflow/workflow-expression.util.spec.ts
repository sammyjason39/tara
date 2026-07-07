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
