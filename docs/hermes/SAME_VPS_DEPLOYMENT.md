# TARA + Hermes Same-VPS Deployment

Recommended production architecture for TARA HR plus Hermes WhatsApp HR Assistant on one VPS.

## Architecture

```txt
Staff WhatsApp
  -> Kapso WhatsApp API
  -> HTTPS webhook
  -> TARA backend /v1/whatsapp/webhook
  -> TARA event bus: whatsapp.message.inbound
  -> Hermes agent service on same VPS
  -> TARA Hermes API: /v1/hermes/query and /v1/hermes/actions
  -> WhatsAppAgent sends reply through Kapso
```

Run these on one VPS:

```txt
tara-backend       NestJS API on localhost:3001
tara-frontend      static frontend behind HTTPS
postgres           TARA database
redis              optional cache or queue
hermes             local agent process or service
nginx or caddy     public HTTPS reverse proxy
```

Hermes should call TARA through localhost:

```env
TARA_API_BASE_URL=http://localhost:3001/v1
TARA_HERMES_AGENT_ID=tara-wa-agent
```

## Public URLs

```txt
https://tara.example.com                          -> frontend
https://api.tara.example.com                      -> backend localhost:3001
https://api.tara.example.com/v1/whatsapp/webhook  -> Kapso webhook
```

Keep `/v1/hermes/*` protected by the Hermes API key header. If possible, restrict it to localhost or the VPS private network at the reverse proxy layer.

## Backend env vars

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=change-this
ALLOWED_ORIGINS=https://tara.example.com

KAPSO_API_KEY=...
KAPSO_PHONE_NUMBER_ID=597907523413541
KAPSO_BUSINESS_ACCOUNT_ID=2102230076919824
KAPSO_CONFIG_ID=31b31160-36d4-4468-92b6-2458fa6b949e
KAPSO_WEBHOOK_SECRET=...

HERMES_WA_LOCAL_MVP_ENABLED=false
```

## Deployment commands

```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start:prod
```

For Docker, run the same build and migration steps inside the backend image or container.

## Kapso setup

Kapso webhook URL:

```txt
https://api.tara.example.com/v1/whatsapp/webhook
```

Webhook secret in Kapso must match `KAPSO_WEBHOOK_SECRET`.

Events to enable:

```txt
whatsapp.message.received
whatsapp.message.status
```

## Two rollout modes

### 1. Production smoke mode

Use this only to prove Kapso + TARA + employee identity + outbound reply works before the real Hermes consumer is ready.

```env
HERMES_WA_LOCAL_MVP_ENABLED=true
```

Supported hardcoded MVP intent:

```txt
Sisa cuti saya berapa?
```

The backend replies directly through `HermesWhatsAppBridgeAgent`.

### 2. Real Hermes mode

Use this for the target Agentic AI architecture.

```env
HERMES_WA_LOCAL_MVP_ENABLED=false
```

Run a Hermes service or consumer on the same VPS that:

1. Reads `whatsapp.message.inbound` events from `/v1/hermes/events/replay` or WebSocket event stream.
2. Calls `/v1/hermes/query` for employee data, leave balance, history, SOP, and context.
3. Uses the LLM to decide the response.
4. Calls `/v1/hermes/actions` with `send_whatsapp_reply`.

## Verification checklist

```bash
curl -fsS https://api.tara.example.com/health
curl -i "https://api.tara.example.com/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_SECRET&hub.challenge=ok"
```

Expected webhook verification response:

```txt
HTTP 200
ok
```

Then send WhatsApp from a verified employee number.

Employee requirements:

```txt
employment_status = active
whatsapp_number matches sender phone
whatsapp_opted_in = true
whatsapp_verified = true
```

## Hermes onboarding endpoints

```txt
GET  /v1/hermes/actions/catalog
POST /v1/hermes/query
POST /v1/hermes/actions
POST /v1/hermes/suggestions
GET  /v1/hermes/events/replay
GET  /v1/hermes/events/audit
GET  /v1/hermes/events/stats
```

Recommended first Hermes tools:

```txt
tara_replay_events(since, types)
tara_query(query_type, params)
tara_action(action, params)
```
