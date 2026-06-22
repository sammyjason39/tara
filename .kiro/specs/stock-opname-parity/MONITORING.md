# Post-Deployment Monitoring Checklist

## Stock Opname Parity — Rollout Monitoring (Task 11.3)

This document defines the metrics, feedback loops, and verification criteria to track after
deploying the Stock Opname Parity feature. It fulfills Requirement 11.10 (verification suite
passes at each phase).

---

## 1. Usage Metrics to Track

### Quick Register vs Detailed Registration

| Metric | Source | Purpose |
|--------|--------|---------|
| Count of Quick Register actions per session | Frontend event / API logs (`POST /inventory/items/batch-incomplete`) | Measure adoption of the non-blocking flow |
| Count of detailed registrations per session | Frontend event / API logs (existing item-create endpoint) | Compare with Quick Register usage |
| Ratio: Quick Register / Total registrations | Derived | Target: >70% use Quick Register for faster counts |
| Time from scan to commit (with Quick Register) | Session timestamps (`createdAt` → commit time) | Verify Quick Register reduces session duration |

### Anomaly Workflow

| Metric | Source | Purpose |
|--------|--------|---------|
| Anomaly items created per day/week | DB query: `WHERE is_anomaly = true AND created_at > interval` | Volume of incomplete items generated |
| Anomaly items completed (flag cleared) per day/week | DB query: `WHERE is_anomaly = false AND updated_at > interval` | Completion rate — items being resolved |
| Average time-to-completion for anomaly items | `updated_at - created_at` where flag cleared | How quickly anomalies get resolved |
| Anomaly items still pending (backlog) | DB query: `WHERE is_anomaly = true` total count | Monitor growing backlogs |

### Session Resilience

| Metric | Source | Purpose |
|--------|--------|---------|
| Sessions restored from localStorage | Frontend log on `loadOpnameSession()` success | Confirm persistence is working |
| Sessions lost (reload without restore) | Support tickets / error logs | Detect persistence failures |
| Abandoned audit cycles flagged | DB: cycles with no commit and no explicit cancel | Monitor need for void/approval workflow |

### Role-Gated Void/Approval

| Metric | Source | Purpose |
|--------|--------|---------|
| Void requests submitted | `POST /inventory/items/void-request` count | Volume of cleanup actions |
| Approvals granted vs rejected | Approval_Request table status counts | Approval workflow health |
| Average approval turnaround time | `approved_at - requested_at` | Identify bottlenecks |
| Immediate voids (Owner/Superadmin) | Void requests with `status: "approved"` at creation | Monitor elevated-role usage |

---

## 2. Error Monitoring

| Signal | Action |
|--------|--------|
| Quick Register API returns 5xx | Alert — items may not be created; barcodes stuck in unresolved |
| localStorage quota exceeded | Log warning — session may not persist on reload |
| Anomaly category creation fails | Alert — Quick Register will fail downstream |
| Page lock detected (`pointer-events: none` on body) | Critical bug — regression of Requirement 3 defect |
| Modal close without cleanup | Monitor via automated UI test or Sentry breadcrumbs |

---

## 3. User Feedback Collection

- [ ] Add a brief "Was this helpful?" prompt after Quick Register completes (optional, non-blocking)
- [ ] Collect qualitative feedback from retail auditors on the anomaly resolution UX
- [ ] Track support tickets mentioning "opname", "stuck", "locked", or "lost count"
- [ ] Conduct post-deployment interviews with 2-3 branch auditors after 1 week

---

## 4. Verification Criteria (Requirement 11.10)

The rollout is considered successful when:

1. **Quick Register adoption** — ≥50% of unregistered-item resolutions use Quick Register
   within 2 weeks of deployment
2. **No Page Lock regressions** — Zero support tickets or Sentry events for page lock after
   modal interactions
3. **Session resilience** — <5% of sessions report data loss on reload
4. **Anomaly completion rate** — ≥60% of anomaly items completed within 7 days of creation
5. **Approval workflow functional** — All void requests processed (approved or rejected) within
   48 hours
6. **All property-based tests pass** — Properties 1, 2, 3 in CI remain green
7. **E2E test suite green** — Opname workflow, retail branch scoping, session reload tests pass

---

## 5. Iteration Triggers

Take action if any of the following occur:

| Trigger | Suggested Action |
|---------|-----------------|
| Quick Register adoption <30% after 2 weeks | UX review — button may not be discoverable |
| Anomaly backlog growing >100 items/week | Add reminder notifications for incomplete items |
| Approval turnaround >72 hours | Notify elevated roles; consider escalation path |
| Session data loss reports >3/week | Investigate localStorage limits; consider IndexedDB |
| Page lock regression detected | Hotfix — revert or patch modal cleanup logic |

---

## 6. Audit Trail Readiness

The following audit trail entries are expected to be logged by the implementation:

- [x] Void request created (requester, item/cycle, reason, timestamp)
- [x] Void approved (approver, reason, timestamp)
- [x] Void rejected (rejector, reason, timestamp)
- [x] Quick Register batch created (user, barcodes, session, timestamp)
- [x] Anomaly flag cleared on item completion (user, item, new category, timestamp)
- [x] Abandoned audit cycle flagged (cycle ID, branch, timestamp)

> Note: These are design-specified audit points. Implementation of the actual logging
> is covered by tasks 7.1–7.4 and 4.3. This checklist confirms the monitoring plan
> accounts for them.

---

## Status

- **Created:** Task 11.3 completion
- **Owner:** Team lead / DevOps
- **Review cadence:** Weekly for first 2 weeks post-deploy, then biweekly
