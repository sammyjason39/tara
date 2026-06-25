# TARA HR System: Notification Privacy Rules

**Task 13.2: Notification Privacy Rules Implementation**

## Overview

This document describes the automatic privacy rule enforcement for notifications in the TARA HR System. Privacy rules are enforced automatically based on notification type, ensuring compliance with requirements 9.1-9.6.

## Privacy Levels

### 1. Public Announcements (`public`)
- **Visibility**: All active employees
- **Use Cases**: Company-wide information that promotes transparency
- **Example**: Daily tardiness reports

### 2. Private Notifications (`private`)
- **Visibility**: Recipient employee only
- **Use Cases**: Personal, confidential, or sensitive information
- **Example**: Clock confirmations, warning letters, personal leave confirmations

### 3. HR Team Only (`hr_team_only`)
- **Visibility**: HR Team members (and optionally Supervisors)
- **Use Cases**: Administrative reports, analytics, summaries
- **Example**: Weekly attendance recaps, productivity reports

## Automatic Privacy Rule Enforcement

The `NotificationService` automatically determines the correct visibility level based on the notification type. Manual override is **not allowed** for types with defined privacy rules.

### Privacy Rule Mapping

| Notification Type | Visibility | Requirement | Rationale |
|------------------|------------|-------------|-----------|
| **TARDINESS_REPORT** | `public` | 9.1 | Promotes accountability and transparency |
| **TARDINESS_ANNOUNCEMENT** | `public` | 9.1 | Public notification of attendance issues |
| **ATTENDANCE_ANNOUNCEMENT** | `public` | 9.1 | Company-wide attendance information |
| **CLOCK_IN_CONFIRMATION** | `private` | 9.3 | Personal attendance confirmation |
| **CLOCK_OUT_CONFIRMATION** | `private` | 9.3 | Personal attendance confirmation |
| **WARNING_LETTER** | `private` | 9.2 | Confidential disciplinary action |
| **LEAVE_REQUEST_CONFIRMATION** | `private` | 9.3 | Personal leave request acknowledgment |
| **LEAVE_APPROVAL** | `private` | 9.3 | Personal leave approval notification |
| **LEAVE_REJECTION** | `private` | 9.3 | Personal leave rejection notification |
| **LEAVE_BALANCE_RECAP** | `private` | 9.3 | Personal leave balance information |
| **WEEKLY_CHECKIN_FORM** | `private` | 9.3 | Personal productivity check-in |
| **WEEKLY_CHECKIN_REMINDER** | `private` | 9.3 | Personal reminder for check-in |
| **ONBOARDING_NOTIFICATION** | `private` | 9.3 | Personal onboarding steps |
| **GENERAL_NOTIFICATION** | `private` | 9.3 | Default personal notification |
| **WEEKLY_ATTENDANCE_RECAP** | `hr_team_only` | 9.4 | Administrative attendance summary |
| **WEEKLY_CHECKIN_REPORT** | `hr_team_only` | 9.5 | Productivity report for management |
| **ONBOARDING_COMPLETION_SUMMARY** | `hr_team_only` | 9.4 | Onboarding progress for HR |
| **SUPERVISOR_LEAVE_REQUEST** | `hr_team_only` | 9.4 | Leave approval workflow |

## Requirements Mapping

### Requirement 9.1: Public Tardiness Notifications
**Status**: ✅ Enforced

Tardiness notifications (`TARDINESS_REPORT`, `TARDINESS_ANNOUNCEMENT`) are automatically sent as public announcements visible to all employees.

```typescript
// Automatic enforcement - no manual visibility needed
await notificationService.sendPublicAnnouncement({
  type: TaraNotificationType.TARDINESS_REPORT,
  title: 'Daily Tardiness Report - January 15, 2026',
  content: '3 employees arrived after 09:00 WIB today: ...',
});
// Result: Sent to ALL active employees with visibility = 'public'
```

### Requirement 9.2: Private Warning Letters
**Status**: ✅ Enforced

Warning letters are automatically marked as private notifications, visible only to the recipient employee.

```typescript
// Automatic enforcement - always private
await notificationService.sendPrivateNotification({
  recipient_id: 'employee-123',
  type: TaraNotificationType.WARNING_LETTER,
  title: 'Warning Letter - SP1',
  content: 'Official warning for policy violation...',
});
// Result: Sent to employee-123 ONLY with visibility = 'private'
```

**Privacy Protection**: Attempting to send warning letters as public will be rejected:
```typescript
// This will THROW an error
await notificationService.sendPublicAnnouncement({
  type: TaraNotificationType.WARNING_LETTER, // ERROR!
  title: 'Warning Letter',
  content: 'Content',
});
// Error: "Cannot send warning_letter as public announcement. 
//         This notification type requires private visibility per privacy rules."
```

### Requirement 9.3: Private Clock Confirmations
**Status**: ✅ Enforced

Clock-in and clock-out confirmations are automatically sent as private notifications.

```typescript
// Automatic enforcement - always private
await notificationService.sendPrivateNotification({
  recipient_id: 'employee-123',
  type: TaraNotificationType.CLOCK_IN_CONFIRMATION,
  title: 'Clock In Confirmed',
  content: 'You clocked in at 08:00 WIB',
});
// Result: Sent to employee-123 ONLY with visibility = 'private'
```

### Requirement 9.4: Weekly Attendance Recaps for HR Team Only
**Status**: ✅ Enforced

Weekly attendance recaps are automatically sent only to HR Team members.

```typescript
// Automatic enforcement - HR Team only
await notificationService.sendHRTeamNotification({
  type: TaraNotificationType.WEEKLY_ATTENDANCE_RECAP,
  title: 'Weekly Attendance Recap - Week of Jan 13-17',
  content: 'Total workdays: 5, Total tardiness incidents: 12...',
});
// Result: Sent to ALL HR Team members ONLY with visibility = 'hr_team_only'
```

### Requirement 9.5: Weekly Check-in Reports for HR Team and Supervisors
**Status**: ✅ Enforced

Weekly productivity check-in reports can be sent to both HR Team and Supervisors.

```typescript
// Include supervisors in HR Team notification
await notificationService.sendHRTeamNotification({
  type: TaraNotificationType.WEEKLY_CHECKIN_REPORT,
  title: 'Weekly Productivity Report',
  content: 'Department summaries and trend analysis...',
  include_supervisors: true, // Send to both HR Team and Supervisors
});
// Result: Sent to HR Team + Supervisors with visibility = 'hr_team_only'
```

### Requirement 9.6: Warning Letters Never Broadcast
**Status**: ✅ Enforced

Warning letters cannot be sent as public announcements or to multiple recipients. The system enforces private-only visibility.

```typescript
// Validation prevents privacy violations
try {
  await notificationService.sendNotification({
    recipient_id: 'employee-123',
    type: TaraNotificationType.WARNING_LETTER,
    visibility: 'public', // Attempt to override to public
    title: 'Warning',
    content: 'Content',
  });
} catch (error) {
  // Error: "Privacy rule violation: warning_letter requires private 
  //         visibility but public was requested."
}
```

## Usage Examples

### Example 1: Send Tardiness Report (Public)
```typescript
const employees = await notificationService.sendPublicAnnouncement({
  type: TaraNotificationType.TARDINESS_REPORT,
  title: 'Daily Tardiness Report - January 15, 2026',
  content: `
    The following employees arrived after 09:00 WIB today:
    - John Doe (09:15 WIB)
    - Jane Smith (09:30 WIB)
    - Bob Johnson (09:05 WIB)
  `,
  metadata: {
    date: '2026-01-15',
    tardy_count: 3,
    tardy_employee_ids: ['emp-1', 'emp-2', 'emp-3'],
  },
});
// Automatically enforced as PUBLIC, sent to all active employees
```

### Example 2: Send Clock Confirmation (Private)
```typescript
const notification = await notificationService.sendPrivateNotification({
  recipient_id: employeeId,
  type: TaraNotificationType.CLOCK_IN_CONFIRMATION,
  title: 'Clock In Confirmed',
  content: `You clocked in at ${clockInTime} WIB`,
  metadata: {
    timestamp: clockInTime,
    location: gpsCoordinates,
    source: 'mobile',
  },
});
// Automatically enforced as PRIVATE, sent to employee only
```

### Example 3: Send Warning Letter (Private, Enforced)
```typescript
const notification = await notificationService.sendPrivateNotification({
  recipient_id: employeeId,
  type: TaraNotificationType.WARNING_LETTER,
  title: 'Warning Letter - SP1',
  content: warningLetterContent,
  metadata: {
    warning_level: 'SP1',
    issue_date: new Date(),
    reason: 'Policy violation',
  },
});
// Automatically enforced as PRIVATE, cannot be made public
```

### Example 4: Send Weekly Recap to HR Team Only
```typescript
const notifications = await notificationService.sendHRTeamNotification({
  type: TaraNotificationType.WEEKLY_ATTENDANCE_RECAP,
  title: 'Weekly Attendance Recap',
  content: weeklyAttendanceSummary,
  metadata: {
    week_start: '2026-01-13',
    week_end: '2026-01-17',
    total_employees: 150,
    total_tardiness: 12,
    departments: departmentBreakdown,
  },
});
// Automatically enforced as HR_TEAM_ONLY, sent to HR Team members
```

### Example 5: Send Report to HR Team and Supervisors
```typescript
const notifications = await notificationService.sendHRTeamNotification({
  type: TaraNotificationType.WEEKLY_CHECKIN_REPORT,
  title: 'Weekly Productivity Check-in Report',
  content: productivitySummary,
  include_supervisors: true, // Include supervisors
  metadata: {
    week: '2026-W03',
    response_rate: 0.95,
    departments: departmentData,
  },
});
// Sent to HR Team + Supervisors, enforced as HR_TEAM_ONLY
```

## Error Handling

### Privacy Rule Violation
When attempting to violate privacy rules:
```typescript
// Throws error - privacy rules are enforced
await notificationService.sendPublicAnnouncement({
  type: TaraNotificationType.WARNING_LETTER, // Private-only type
  title: 'Warning',
  content: 'Content',
});
// Error: "Cannot send warning_letter as public announcement. 
//         This notification type requires private visibility per privacy rules."
```

### Unknown Notification Type
Unknown notification types default to private for safety:
```typescript
const notification = await notificationService.sendNotification({
  recipient_id: 'employee-123',
  type: 'unknown_type', // Not in TARA notification types
  title: 'Unknown Notification',
  content: 'Some content',
});
// Result: visibility = 'private' (safe default)
// Warning logged: "Unknown notification type: unknown_type, defaulting to PRIVATE"
```

## Testing Privacy Rules

Unit tests verify privacy rule enforcement:

1. **Test Public Notifications**: Verify tardiness reports are PUBLIC
2. **Test Private Notifications**: Verify warning letters and clock confirmations are PRIVATE
3. **Test HR Team Notifications**: Verify weekly recaps are HR_TEAM_ONLY
4. **Test Privacy Violations**: Verify manual overrides are rejected
5. **Test Unknown Types**: Verify unknown types default to PRIVATE

Run tests:
```bash
npm test -- notification.service.spec.ts
```

## Implementation Details

### Privacy Rule Configuration
Privacy rules are defined in `NOTIFICATION_PRIVACY_RULES` constant:
```typescript
export const NOTIFICATION_PRIVACY_RULES: Record<TaraNotificationType, NotificationVisibility> = {
  [TaraNotificationType.TARDINESS_REPORT]: NotificationVisibility.PUBLIC,
  [TaraNotificationType.WARNING_LETTER]: NotificationVisibility.PRIVATE,
  // ... more rules
};
```

### Automatic Enforcement
The `determineVisibility()` method automatically determines visibility:
```typescript
private determineVisibility(notificationType: string): NotificationVisibility {
  if (notificationType in NOTIFICATION_PRIVACY_RULES) {
    return NOTIFICATION_PRIVACY_RULES[notificationType as TaraNotificationType];
  }
  return NotificationVisibility.PRIVATE; // Safe default
}
```

### Validation
The `validateVisibility()` method prevents manual overrides:
```typescript
private validateVisibility(notificationType: string, requestedVisibility: string): void {
  const enforcedVisibility = this.determineVisibility(notificationType);
  if (requestedVisibility && requestedVisibility !== enforcedVisibility) {
    throw new Error(`Privacy rule violation...`);
  }
}
```

## Summary

✅ **Task 13.2 Complete**: Notification privacy rules are fully implemented and enforced automatically.

**Key Features**:
- Automatic privacy rule enforcement based on notification type
- Public announcements for tardiness (Req 9.1)
- Private notifications for warning letters and clock confirmations (Req 9.2, 9.3)
- HR Team-only notifications for weekly recaps (Req 9.4, 9.5)
- Privacy violation prevention (Req 9.6)
- Safe default (PRIVATE) for unknown types
- Comprehensive unit tests
- Clear documentation and examples

**Requirements Satisfied**:
- ✅ 9.1: Tardiness notifications as Public_Announcements
- ✅ 9.2: Warning letters as Private_Notifications
- ✅ 9.3: Clock confirmations as Private_Notifications
- ✅ 9.4: Weekly attendance recaps sent only to HR_Team
- ✅ 9.5: Weekly check-in reports to HR_Team and Supervisors
- ✅ 9.6: Warning letters never broadcast
