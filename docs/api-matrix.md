# Provider API matrix

This matrix records the integration boundary, not a claim of production connectivity. No real-money, KYC, portfolio, or customer-message request is made until the listed access is supplied, configuration is reviewed, and sandbox tests pass.

| Provider / boundary | Purpose | Authentication / configuration | Current status | Notes |
| --- | --- | --- | --- | --- |
| TechArtha Auth | OTP, sessions, devices | `JWT_SECRET`, `OTP_HASH_SECRET`, provider credentials | `MOCK` | OTPs are HMAC-hashed, rate-limited and never logged. Mock code return needs the explicit development flag. |
| HyperVerge | KYC SDK session and callbacks | Approved product docs, `HYPERVERGE_*`, verified webhook scheme | `NOT CONFIGURED — CREDENTIAL REQUIRED` | Endpoint paths and signature mapping are intentionally not guessed. |
| Digio | KYC/e-sign fallback | Approved product docs and `DIGIO_*` | `NOT CONFIGURED — CREDENTIAL REQUIRED` | Provider interface/documentation to be completed after commercial access. |
| BSE StAR MF V2 | Orders, SIPs, redemptions, status | Supplied/current BSE StAR MF V2 docs, sandbox and `BSE_*` | `NOT CONFIGURED — AUTHORISED ACCESS REQUIRED` | The promised source document is absent; no endpoints are implemented or invented. |
| NSE / transaction infrastructure | Authorised transaction workflow | Approved docs and `NSE_*` | `NOT CONFIGURED — AUTHORISED ACCESS REQUIRED` | Never substitute MFAPI for transaction execution. |
| CAMS / KFintech | Portfolio reconciliation | Authorised RTA agreement and `CAMS_*` / `KFINTECH_*` | `NOT CONFIGURED — CREDENTIAL REQUIRED` | Empty portfolio is returned rather than fabricated holdings. |
| MFAPI | Scheme search and public NAV reference | No API key; `MFAPI_BASE_URL` | `PUBLIC REFERENCE ONLY` | API responses are cached five minutes. It is non-authoritative for orders and reconciliation. |
| Zoho CRM | CRM lifecycle/support integration | Server-side OAuth client and least privilege `ZOHO_*` | `NOT CONFIGURED — CREDENTIAL REQUIRED` | Zoho V8 documentation requires OAuth; access/refresh tokens must stay server side. |
| WhatsApp Business | Verified inbound/outbound user communication | Business verification, approved templates, `WHATSAPP_*` | `NOT CONFIGURED — CREDENTIAL REQUIRED` | Webhook acknowledges only; it does not invent user KYC or plan status. |
| Sarvam or approved Indic voice provider | Indic STT/TTS | Approved provider agreement and `SARVAM_*` | `NOT CONFIGURED — CREDENTIAL REQUIRED` | Current voice intent layer can only interpret typed mock text and cannot execute actions. |
| AI provider | Explanations with consented context | `AI_PROVIDER`, `AI_API_KEY`, safety review | `MOCK RULE-BASED SAFETY GATEWAY` | No unsupported quote, NAV, portfolio or advice is invented. |

## Current API surface

- `POST /auth/send-otp`, `POST /auth/verify-otp`, `POST /auth/refresh`, `POST /auth/logout`
- `GET|POST /consents`, `POST /consents/:id/revoke`
- `POST /kyc/start`, `GET /kyc/status`
- `GET /risk/questionnaire`, `POST /risk/calculate`
- `GET /goals`, `POST /goals/simulate`, `POST /goals/select`, `GET /buckets`
- `GET /portfolio`, `GET|POST /expenses`, `GET /learning`, `POST /learning/:lessonKey/complete`
- `POST /assistant/messages`, `GET /voice/status`, `POST /voice/interpret`
- `GET /health`, `/health/database`, `/health/redis`, `/health/providers`

All routes that retrieve or change a user's data require the authenticated user identity from the bearer token; callers cannot select arbitrary users through a `userId` request field.

## Required before production

1. Obtain the missing BSE StAR MF V2 and KYC provider product documentation, sandbox access, data-processing approval, and webhook signing details.
2. Move the development SQLite persistence to reviewed PostgreSQL migrations and enable encrypted managed backups.
3. Implement provider client/service/mapper/DTO/error-handler/test packages from the approved provider specifications.
4. Add OpenAPI generation and a Postman collection after route DTOs are finalised; Swagger is not claimed yet because `@nestjs/swagger` is not installed.
5. Complete legal, compliance, privacy, security, transaction, webhook, disaster-recovery and app-store reviews.
