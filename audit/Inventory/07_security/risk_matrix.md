# Risk Matrix - Inventory Department Security

## Vulnerability Scorecard

| Risk ID | Title | Impact | Likelihood | Mitigation Status |
| --- | --- | --- | --- | --- |
| **SEC-01** | Multi-Tenant Data Leakage | CRITICAL | LOW | ✅ TenantInterceptor/Guard Active |
| **SEC-02** | Cross-Location Stock Move | MEDIUM | MEDIUM | ❌ Missing LocationGuard in Post |
| **SEC-03** | Self-Approval of Adjustment | HIGH | HIGH | ❌ Logic check `approved_by != requester` missing |
| **SEC-04** | API Injection in SKU Query | LOW | LOW | ✅ Clean DTO/Validation in Controller |
| **SEC-05** | Unauthorized Barcode Mapping | MEDIUM | LOW | ✅ Protected in `PATCH /items/:id` |

## Key Findings
- **High Risk**: The ability for a user to approve their own stock adjustment requests creates a significant internal fraud risk.
- **Medium Risk**: Lack of `LocationGuard` on POST endpoints relies purely on UI filtering; direct API manipulation remains possible. 
- **Summary**: Overall security architecture is robust (Multi-Tenant foundation is solid), but granular business-rule authorization needs tightening.
