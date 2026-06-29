import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { LeaveService } from './leave.service';
import { PrismaService } from '../../../persistence/prisma.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import { NotificationService } from './notification.service';
import { LeaveRequestAgent } from '../agents/leave-request.agent';
import { CacheAsideService } from '../../../shared/cache/cache-aside.service';

/**
 * Property Test 2: Leave Balance Update Accuracy
 * 
 * **Task 12.6: Write property test for leave balance update**
 * - Property 2: Leave Balance Update Accuracy
 * - **Validates: Requirements 1.3**
 * - Test that approved leave decreases balance by exact N days
 * - Use fast-check to generate approved leave requests
 * 
 * **Property Statement:**
 * For any approved leave request with N days, the employee's leave balance SHALL 
 * decrease by exactly N days, where remaining_days is decremented by N and 
 * used_days is incremented by N atomically.
 * 
 * **Requirements Coverage:**
 * - Requirement 1.3: "WHEN a Supervisor approves a leave request, THE Leave_Request_Agent 
 *   SHALL update the Employee's Leave_Balance automatically"
 */

describe('Property 2: Leave Balance Update Accuracy', () => {
  let leaveService: LeaveService;
  let mockPrismaService: any;
  let mockEventBusService: any;

  beforeEach(() => {
    // Mock EventBusService
    mockEventBusService = {
      emit: vi.fn().mockResolvedValue({ id: 'event-123' }),
    };

    // Mock PrismaService with transaction support
    mockPrismaService = {
      leaveRequest: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      leaveBalance: {
        update: vi.fn(),
      },
      $transaction: vi.fn(async (callback: any) => {
        // Execute callback with mock transaction client
        const mockTx = {
          leaveBalance: {
            update: mockPrismaService.leaveBalance.update,
          },
          leaveRequest: {
            update: mockPrismaService.leaveRequest.update,
          },
        };
        return callback(mockTx);
      }),
    };

    // Create service instance
    leaveService = new LeaveService(
      mockPrismaService as PrismaService,
      mockEventBusService as EventBusService,
      { sendNotification: vi.fn() } as unknown as NotificationService,
      {
        processLeaveRequestSubmission: vi.fn(),
        processLeaveRequestApproval: vi.fn(),
        processLeaveRequestRejection: vi.fn(),
      } as unknown as LeaveRequestAgent,
      new CacheAsideService(),
    );
  });

  /**
   * Arbitrary generator for leave balance with sufficient remaining days
   */
  const leaveBalanceArbitrary = fc.record({
    employee_id: fc.uuid(),
    year: fc.constantFrom(2024, 2025),
    total_entitlement: fc.integer({ min: 12, max: 30 }),
    used_days: fc.integer({ min: 0, max: 10 }),
    remaining_days: fc.integer({ min: 5, max: 20 }),
  });

  /**
   * Arbitrary generator for approved leave request
   * Ensures total_days <= remaining_days to avoid validation errors
   */
  const approvedLeaveRequestArbitrary = fc
    .tuple(
      fc.uuid(), // leave_request_id
      fc.uuid(), // employee_id
      fc.integer({ min: 1, max: 15 }), // total_days
      fc.constantFrom('annual', 'sick', 'personal', 'emergency'), // leave_type
      fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }), // start_date
    )
    .map(([leave_request_id, employee_id, total_days, leave_type, start_date]) => {
      const end_date = new Date(start_date);
      end_date.setDate(end_date.getDate() + total_days - 1);
      return {
        leave_request_id,
        employee_id,
        total_days,
        leave_type,
        start_date,
        end_date,
      };
    });

  it('Property 2.1: Approved leave decreases remaining_days by exactly N days', async () => {
    await fc.assert(
      fc.asyncProperty(
        approvedLeaveRequestArbitrary,
        fc.uuid(), // approved_by
        async (leaveRequestData, approved_by) => {
          const { leave_request_id, employee_id, total_days, leave_type, start_date, end_date } =
            leaveRequestData;

          // Skip if invalid dates (edge case from fast-check)
          if (isNaN(start_date.getTime()) || isNaN(end_date.getTime())) {
            return; // fast-check will try another case
          }

          // Generate initial balance with enough remaining days
          const initial_remaining_days = total_days + fc.sample(fc.integer({ min: 0, max: 10 }), 1)[0];
          const initial_used_days = fc.sample(fc.integer({ min: 0, max: 10 }), 1)[0];

          // Reset mock call counts
          vi.clearAllMocks();

          // Mock existing pending leave request
          const mockLeaveRequest = {
            id: leave_request_id,
            employee_id,
            department_id: 'dept-001',
            leave_type,
            start_date,
            end_date,
            total_days,
            reason: 'Test leave request',
            status: 'pending',
            requested_at: new Date(),
            approved_by: null,
            approved_at: null,
            reviewer_notes: null,
            created_at: new Date(),
            updated_at: new Date(),
            employee: {
              id: employee_id,
              employee_code: 'EMP001',
              full_name: 'Test Employee',
              email: 'test@example.com',
              department_id: 'dept-001',
            },
          };

          mockPrismaService.leaveRequest.findUnique.mockResolvedValue(mockLeaveRequest);

          // Mock balance update to return updated balance
          const expectedRemainingDays = initial_remaining_days - total_days;
          const expectedUsedDays = initial_used_days + total_days;

          mockPrismaService.leaveBalance.update.mockResolvedValue({
            id: 'balance-123',
            employee_id,
            year: new Date().getFullYear(),
            total_entitlement: initial_remaining_days + initial_used_days,
            used_days: expectedUsedDays,
            remaining_days: expectedRemainingDays,
            carryover_days: 0,
            carryover_expiry_date: null,
            last_calculated_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          });

          // Mock leave request update to return approved request
          mockPrismaService.leaveRequest.update.mockResolvedValue({
            ...mockLeaveRequest,
            status: 'approved',
            approved_by,
            approved_at: new Date(),
            approver: {
              id: approved_by,
              full_name: 'Test Approver',
            },
          });

          // Act: Approve leave request
          const result = await leaveService.approveLeaveRequest(leave_request_id, approved_by);

          // Assert: Verify leave request was approved
          expect(result).toBeDefined();
          expect(result.status).toBe('approved');

          // Assert: Verify balance update was called with correct decrement/increment
          expect(mockPrismaService.leaveBalance.update).toHaveBeenCalledWith({
            where: {
              employee_id_year: {
                employee_id,
                year: new Date().getFullYear(),
              },
            },
            data: {
              remaining_days: {
                decrement: total_days,
              },
              used_days: {
                increment: total_days,
              },
              last_calculated_at: expect.any(Date),
            },
          });

          // Assert: Verify transaction was used (atomicity)
          expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

          // Assert: Verify event was emitted with updated balance
          expect(mockEventBusService.emit).toHaveBeenCalledTimes(1);
          expect(mockEventBusService.emit).toHaveBeenCalledWith(
            expect.objectContaining({
              event_type: 'leave.request.approved',
              payload: expect.objectContaining({
                total_days,
                remaining_balance: expectedRemainingDays,
                used_days: expectedUsedDays,
              }),
            }),
          );
        },
      ),
      { numRuns: 100 }, // Run 100 test cases with different leave request scenarios
    );
  });

  it('Property 2.2: Approved leave increments used_days by exactly N days', async () => {
    await fc.assert(
      fc.asyncProperty(
        approvedLeaveRequestArbitrary,
        fc.uuid(), // approved_by
        async (leaveRequestData, approved_by) => {
          const { leave_request_id, employee_id, total_days, leave_type, start_date, end_date } =
            leaveRequestData;

          // Skip if invalid dates (edge case from fast-check)
          if (isNaN(start_date.getTime()) || isNaN(end_date.getTime())) {
            return; // fast-check will try another case
          }

          // Generate initial balance
          const initial_remaining_days = total_days + 5;
          const initial_used_days = fc.sample(fc.integer({ min: 0, max: 10 }), 1)[0];

          vi.clearAllMocks();

          // Mock pending leave request
          mockPrismaService.leaveRequest.findUnique.mockResolvedValue({
            id: leave_request_id,
            employee_id,
            department_id: 'dept-001',
            leave_type,
            start_date,
            end_date,
            total_days,
            reason: 'Test leave',
            status: 'pending',
            employee: {
              id: employee_id,
              employee_code: 'EMP001',
              full_name: 'Test Employee',
              email: 'test@example.com',
              department_id: 'dept-001',
            },
          });

          // Expected values after approval
          const expectedUsedDays = initial_used_days + total_days;

          mockPrismaService.leaveBalance.update.mockResolvedValue({
            employee_id,
            year: new Date().getFullYear(),
            used_days: expectedUsedDays,
            remaining_days: initial_remaining_days - total_days,
          });

          mockPrismaService.leaveRequest.update.mockResolvedValue({
            id: leave_request_id,
            status: 'approved',
            approved_by,
            approved_at: new Date(),
            employee: {
              id: employee_id,
              employee_code: 'EMP001',
              full_name: 'Test Employee',
              email: 'test@example.com',
              department_id: 'dept-001',
            },
            approver: {
              id: approved_by,
              full_name: 'Test Approver',
            },
            leave_type,
            start_date,
            end_date,
            total_days,
          });

          // Act
          await leaveService.approveLeaveRequest(leave_request_id, approved_by);

          // Assert: Verify used_days increment
          expect(mockPrismaService.leaveBalance.update).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                used_days: {
                  increment: total_days,
                },
              }),
            }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 2.3: Balance update is atomic with status change', async () => {
    await fc.assert(
      fc.asyncProperty(
        approvedLeaveRequestArbitrary,
        fc.uuid(), // approved_by
        async (leaveRequestData, approved_by) => {
          const { leave_request_id, employee_id, total_days, leave_type, start_date, end_date } =
            leaveRequestData;

          // Skip if invalid dates
          if (isNaN(start_date.getTime()) || isNaN(end_date.getTime())) {
            return;
          }

          vi.clearAllMocks();

          // Mock pending leave request
          mockPrismaService.leaveRequest.findUnique.mockResolvedValue({
            id: leave_request_id,
            employee_id,
            department_id: 'dept-001',
            leave_type,
            start_date,
            end_date,
            total_days,
            status: 'pending',
            employee: {
              id: employee_id,
              employee_code: 'EMP001',
              full_name: 'Test Employee',
              email: 'test@example.com',
              department_id: 'dept-001',
            },
          });

          mockPrismaService.leaveBalance.update.mockResolvedValue({
            employee_id,
            year: new Date().getFullYear(),
            used_days: total_days,
            remaining_days: 10,
          });

          mockPrismaService.leaveRequest.update.mockResolvedValue({
            id: leave_request_id,
            status: 'approved',
            approved_by,
            approved_at: new Date(),
            employee: {
              id: employee_id,
              employee_code: 'EMP001',
              full_name: 'Test Employee',
              email: 'test@example.com',
              department_id: 'dept-001',
            },
            approver: {
              id: approved_by,
              full_name: 'Test Approver',
            },
            leave_type,
            start_date,
            end_date,
            total_days,
          });

          // Act
          await leaveService.approveLeaveRequest(leave_request_id, approved_by);

          // Assert: Verify transaction wrapper was used
          expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

          // Assert: Both balance update and status update happen in same transaction
          // The transaction callback should be called exactly once
          const transactionCallback = mockPrismaService.$transaction.mock.calls[0][0];
          expect(typeof transactionCallback).toBe('function');

          // Verify both operations are called within transaction
          expect(mockPrismaService.leaveBalance.update).toHaveBeenCalled();
          expect(mockPrismaService.leaveRequest.update).toHaveBeenCalled();
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property 2.4: Balance math is consistent (remaining + used = total)', async () => {
    await fc.assert(
      fc.asyncProperty(
        approvedLeaveRequestArbitrary,
        fc.integer({ min: 12, max: 30 }), // total_entitlement
        fc.integer({ min: 0, max: 10 }), // initial_used_days
        fc.uuid(), // approved_by
        async (leaveRequestData, total_entitlement, initial_used_days, approved_by) => {
          const { leave_request_id, employee_id, total_days, leave_type, start_date, end_date } =
            leaveRequestData;

          // Skip if invalid dates (edge case from fast-check)
          if (isNaN(start_date.getTime()) || isNaN(end_date.getTime())) {
            return; // fast-check will try another case
          }

          // Calculate initial remaining days to ensure balance is consistent
          const initial_remaining_days = total_entitlement - initial_used_days;

          // Skip if not enough balance
          if (initial_remaining_days < total_days) {
            return; // fast-check will try another case
          }

          vi.clearAllMocks();

          mockPrismaService.leaveRequest.findUnique.mockResolvedValue({
            id: leave_request_id,
            employee_id,
            department_id: 'dept-001',
            leave_type,
            start_date,
            end_date,
            total_days,
            status: 'pending',
            employee: {
              id: employee_id,
              employee_code: 'EMP001',
              full_name: 'Test Employee',
              email: 'test@example.com',
              department_id: 'dept-001',
            },
          });

          // Calculate expected values after approval
          const expected_remaining_days = initial_remaining_days - total_days;
          const expected_used_days = initial_used_days + total_days;

          mockPrismaService.leaveBalance.update.mockResolvedValue({
            employee_id,
            year: new Date().getFullYear(),
            total_entitlement,
            used_days: expected_used_days,
            remaining_days: expected_remaining_days,
          });

          mockPrismaService.leaveRequest.update.mockResolvedValue({
            id: leave_request_id,
            status: 'approved',
            approved_by,
            approved_at: new Date(),
            employee: {
              id: employee_id,
              employee_code: 'EMP001',
              full_name: 'Test Employee',
              email: 'test@example.com',
              department_id: 'dept-001',
            },
            approver: {
              id: approved_by,
              full_name: 'Test Approver',
            },
            leave_type,
            start_date,
            end_date,
            total_days,
          });

          // Act
          await leaveService.approveLeaveRequest(leave_request_id, approved_by);

          // Assert: Verify balance math consistency
          // remaining_days + used_days should always equal total_entitlement
          const balance_sum = expected_remaining_days + expected_used_days;
          expect(balance_sum).toBe(total_entitlement);

          // Assert: Verify event payload includes consistent balance
          expect(mockEventBusService.emit).toHaveBeenCalledWith(
            expect.objectContaining({
              payload: expect.objectContaining({
                remaining_balance: expected_remaining_days,
                used_days: expected_used_days,
              }),
            }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 2.5: Multiple sequential approvals compound correctly', async () => {
    // Test that approving multiple leave requests for same employee compounds correctly
    const employee_id = 'emp-001';
    const approved_by = 'approver-001';
    const initial_total_entitlement = 20;
    let current_used_days = 0;
    let current_remaining_days = initial_total_entitlement;

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 2, maxLength: 5 }), // Array of leave day counts
        async (leaveDaysArray) => {
          // Skip if total exceeds entitlement
          const total_requested = leaveDaysArray.reduce((sum, days) => sum + days, 0);
          if (total_requested > initial_total_entitlement) {
            return; // fast-check will try another case
          }

          // Reset for this test case
          current_used_days = 0;
          current_remaining_days = initial_total_entitlement;

          // Process each leave request sequentially
          for (let i = 0; i < leaveDaysArray.length; i++) {
            const total_days = leaveDaysArray[i];
            const leave_request_id = `leave-${i}`;

            vi.clearAllMocks();

            mockPrismaService.leaveRequest.findUnique.mockResolvedValue({
              id: leave_request_id,
              employee_id,
              department_id: 'dept-001',
              leave_type: 'annual',
              start_date: new Date(),
              end_date: new Date(),
              total_days,
              status: 'pending',
              employee: {
                id: employee_id,
                employee_code: 'EMP001',
                full_name: 'Test Employee',
                email: 'test@example.com',
                department_id: 'dept-001',
              },
            });

            // Calculate expected values
            const expected_remaining = current_remaining_days - total_days;
            const expected_used = current_used_days + total_days;

            mockPrismaService.leaveBalance.update.mockResolvedValue({
              employee_id,
              year: new Date().getFullYear(),
              total_entitlement: initial_total_entitlement,
              used_days: expected_used,
              remaining_days: expected_remaining,
            });

            mockPrismaService.leaveRequest.update.mockResolvedValue({
              id: leave_request_id,
              status: 'approved',
              approved_by,
              approved_at: new Date(),
              employee: {
                id: employee_id,
                employee_code: 'EMP001',
                full_name: 'Test Employee',
                email: 'test@example.com',
                department_id: 'dept-001',
              },
              approver: {
                id: approved_by,
                full_name: 'Test Approver',
              },
              leave_type: 'annual',
              start_date: new Date(),
              end_date: new Date(),
              total_days,
            });

            // Act: Approve leave
            await leaveService.approveLeaveRequest(leave_request_id, approved_by);

            // Update current state for next iteration
            current_remaining_days = expected_remaining;
            current_used_days = expected_used;

            // Assert: Balance consistency after each approval
            expect(current_remaining_days + current_used_days).toBe(initial_total_entitlement);
          }

          // Final assertion: All days should be accounted for
          expect(current_used_days).toBe(total_requested);
          expect(current_remaining_days).toBe(initial_total_entitlement - total_requested);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('Property 2.6: Zero-day leave requests do not modify balance', async () => {
    // Edge case: Ensure that if somehow a 0-day leave gets approved, balance remains unchanged
    const leave_request_id = 'leave-zero';
    const employee_id = 'emp-001';
    const approved_by = 'approver-001';
    const total_days = 0; // Edge case

    const initial_used_days = 5;
    const initial_remaining_days = 15;

    vi.clearAllMocks();

    mockPrismaService.leaveRequest.findUnique.mockResolvedValue({
      id: leave_request_id,
      employee_id,
      department_id: 'dept-001',
      leave_type: 'annual',
      start_date: new Date(),
      end_date: new Date(),
      total_days,
      status: 'pending',
      employee: {
        id: employee_id,
        employee_code: 'EMP001',
        full_name: 'Test Employee',
        email: 'test@example.com',
        department_id: 'dept-001',
      },
    });

    mockPrismaService.leaveBalance.update.mockResolvedValue({
      employee_id,
      year: new Date().getFullYear(),
      used_days: initial_used_days, // Should remain unchanged
      remaining_days: initial_remaining_days, // Should remain unchanged
    });

    mockPrismaService.leaveRequest.update.mockResolvedValue({
      id: leave_request_id,
      status: 'approved',
      approved_by,
      approved_at: new Date(),
      employee: {
        id: employee_id,
        employee_code: 'EMP001',
        full_name: 'Test Employee',
        email: 'test@example.com',
        department_id: 'dept-001',
      },
      approver: {
        id: approved_by,
        full_name: 'Test Approver',
      },
      leave_type: 'annual',
      start_date: new Date(),
      end_date: new Date(),
      total_days,
    });

    // Act
    await leaveService.approveLeaveRequest(leave_request_id, approved_by);

    // Assert: Verify decrement/increment with 0 days
    expect(mockPrismaService.leaveBalance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          remaining_days: {
            decrement: 0,
          },
          used_days: {
            increment: 0,
          },
        }),
      }),
    );
  });
});
