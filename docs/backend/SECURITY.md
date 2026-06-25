# Security

## Authentication

### JWT (JSON Web Token)
- Algorithm: HS256
- Expiration: 8 hours
- Secret: stored in `JWT_SECRET` env variable (must be set in production)
- Payload: `{ sub, email, role, department_id, office_location_id }`

### Password Hashing
- Library: bcryptjs
- Rounds: 12 minimum (configurable via `BCRYPT_ROUNDS`)
- Raw passwords never stored or logged

### Biometric Support
- WebAuthn API integration for mobile fingerprint/face
- Biometric token hash stored (never raw biometric data)
- Fallback to PIN/password when biometric unavailable

## Authorization

### Role-Based Access Control (RBAC)

| Role | Web Access | Mobile Access | Can Approve | Settings |
|------|-----------|---------------|-------------|----------|
| SuperAdmin | Full | Full | All | Full |
| HR_Admin | Full | Personal only | Leaves, Loans | Full |
| Supervisor | Team data | Personal only | Team leaves | None |
| Employee | None | Personal only | None | None |

### Context-Based Data Filtering

Enforced at the API level (not just UI):
- Mobile Interface → always filtered to `WHERE employee_id = :authenticated_user`
- Web Interface + HR role → no filter (administrative access)
- Implemented via `TaraContextQueryService`

### Guards

```typescript
@UseGuards(JwtGuard)           // Requires valid token
@UseGuards(JwtGuard, RolesGuard)  // Requires token + specific role
@Roles('HR_Admin', 'SuperAdmin')   // Role whitelist
```

## API Security

### Rate Limiting
- Authentication endpoints: 5 requests/minute per IP
- General API: 100 requests/minute per user token
- Implemented via `@nestjs/throttler`

### Input Validation
- All DTOs use `class-validator` decorators
- Global `ValidationPipe` with `whitelist: true` strips unknown fields
- Prisma parameterized queries prevent SQL injection

### CORS
- Configured via `ALLOWED_ORIGINS` env variable
- Only whitelisted origins can make requests
- Credentials enabled for cookie-based sessions

### Security Headers (Production)
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- Set via Nginx in production

## Data Protection

### Sensitive Data at Rest
- Passwords: bcrypt hashed (never reversible)
- Biometric tokens: hashed
- Field-level encryption available for PII (via `FIELD_ENCRYPTION_KEY`)

### Data in Transit
- TLS/HTTPS enforced in production
- WebSocket connections encrypted

### Audit Trail
- All mutations logged in `audit_logs` table
- Immutable (no UPDATE or DELETE on audit table)
- Includes: actor, action, context, IP address, timestamp
- 3-year retention policy

## Notification Privacy

| Notification Type | Visibility | Who Sees It |
|-------------------|-----------|-------------|
| Clock confirmation | Private | Only the employee |
| Warning letter (SP) | Private | Only the recipient |
| Tardiness report | Public | All employees |
| Leave approval | Private | Only the requester |
| Weekly recap | Private | HR team only |

## Vulnerability Management

- `npm audit` run in CI/CD pipeline
- Critical vulnerabilities: 48-hour fix SLA
- High vulnerabilities: 7-day fix SLA
- Dependencies use pinned versions (no open ranges)

## Security Checklist for Deployment

- [ ] `JWT_SECRET` set to unique random string (≥32 chars)
- [ ] `BCRYPT_ROUNDS` ≥ 12
- [ ] `NODE_ENV=production`
- [ ] HTTPS/TLS configured
- [ ] CORS `ALLOWED_ORIGINS` restricted to actual domains
- [ ] Database not exposed to public internet
- [ ] Audit logs enabled and retained
- [ ] Rate limiting active
- [ ] No `.env` files committed to git
