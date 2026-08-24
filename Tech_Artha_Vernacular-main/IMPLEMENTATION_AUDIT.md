# TechArtha implementation audit

Audit date: 2026-08-18

## Evidence reviewed

- All tracked and untracked source files under `apps`, `services`, and `packages` (excluding generated `node_modules` and API `dist`).
- Prisma schema and both existing migrations.
- Root, API, web, and mobile package configuration; Docker configuration; and environment template.
- The supplied product specification in the attached `pasted-text.txt`.

No TechArtha logo or reference-slide artefact was available in the repository or supplied attachment. The mobile `icon.png` is the stock Expo-style blue “A” asset rather than a TechArtha logo. Brand tokens therefore need to remain explicitly provisional until the approved logo is supplied. The existing purple/orange presentation styling is treated as legacy reference styling and must not be represented as the final brand system.

## WORKING

- Monorepo workspaces and local dependency installation are present.
- Nest application starts a CORS-enabled HTTP server and exposes a basic health response.
- Prisma schema and SQLite development migrations exist; `PrismaService` is wired into API modules.
- Mock OTP persistence and basic JWT issuance are partially implemented.
- MFAPI scheme search is an actual public-reference HTTP call, but it has no cache or source-status response.
- KYC, risk, goal and portfolio data can be persisted through their current service methods when a valid database is available.
- Web language, login, KYC, risk, goal, bucket, plan, and dashboard routes render.
- Expo navigation shell and main screen sequence render.

## PARTIAL

- Auth stores an OTP record and creates a user, but lacks secure OTP hashing, rate limits, device binding, refresh-session lifecycle, authorization guards, input validation, and production provider abstraction.
- KYC stores a consent row and a record, but does not persist the submitted identity profile, protect PAN data, implement all statuses, or make an authenticated user authoritative.
- HyperVerge has a server-side token request and a webhook receiver, but its URLs/workflow defaults are unverified and its webhook signature path is not implemented.
- Risk scoring is deterministic, but the questionnaire, dimensions, versioning, consent, auditability, and authentication are incomplete.
- Goals calculate a SIP illustration, but use one hard-coded 12% assumption and static bucket names.
- Portfolio reads and writes Prisma records, but fabricates holdings on first read and has no RTA-provider boundary.
- WhatsApp webhook verification exists, but the message responses are fabricated and it is not registered in `AppModule`.
- Mobile and web call several API endpoints, but they pass mutable `userId` values rather than relying on authenticated identity.

## UI_ONLY

- Most dashboard portfolio, expense, learning, funds, profile, bucket, and plan screens use static values.
- Mobile portfolio, expenses, learning, and profile pages are placeholders.
- The mobile app's global voice/AI affordance, accessibility states, and localized copy are absent.
- The web app uses duplicated hard-coded English strings and legacy purple/orange styles.

## MOCK

- KYC `mock` mode immediately verifies a KYC record; it is clearly configured as a mock but lacks a provider interface.
- OTP returns a development OTP value and writes it to server logs.
- Portfolio seeds fabricated CAMS-like holdings during reads.
- WhatsApp supplies fixed KYC and plan messages without authorised data retrieval.

## BROKEN

- `IMPLEMENTATION_STATUS.md` is stale: it says Prisma/auth/schema are missing although implementation now exists.
- Several test files only compile controllers/providers without their required dependencies and do not verify business behavior.
- The API root test expects `Hello World!` while the current service returns a health object.
- API authorization headers are sent by the web UI but are not enforced by the backend.
- `AppModule` omits `WhatsappModule`, so its controller/service cannot run.
- HyperVerge webhook code logs entire payloads, does not verify signatures, and can conflict on duplicate event IDs.
- The API uses SQLite despite the root documentation/environment claiming PostgreSQL, and has duplicate/contradictory `.env.example` entries.

## MISSING

- Approved TechArtha logo/reference slides for brand extraction.
- Central localization resources (`en`, `hi`, `mr`) and an i18n runtime.
- Shared design-system components and accessible theme tokens.
- Consent engine with consent versions/events/audit history; backend authentication guards; secure session/device/login audit services.
- Onboarding profile, age/minor, guardian, bank, address, nominee, and signature workflows.
- Goal simulator scenarios, bucket eligibility/rule versions, fund disclosures/Risk-o-Meter, cart/orders, transaction lifecycle, expenses, learning persistence, notifications, support, admin approval, analytics, and document wallet.
- AI and voice provider abstractions with a safety guard and confirmed-action boundary.
- Provider interfaces, adapter tests, webhook idempotency/signature verification, OpenAPI, Postman collection, health probes, observability, backups, CI/E2E coverage, and deployment configuration.

## NOT_CONNECTED

- No real HyperVerge, Digio, CAMS, KFintech, BSE StAR MF, NSE, Zoho, WhatsApp, SMS, email, Sarvam, AI, or account-aggregation credentials are configured or validated.
- No supplied BSE StAR MF V2 documentation is present; no real order endpoint should be invented.
- Web and mobile share no real localization/session persistence mechanism and have no live data hydration for most dashboard features.
- The mobile `API_URL` contains a desktop-only default and is not a low-end Android device-safe configuration.

## Refactor direction

The foundation should remain a NestJS + Prisma API, Next.js web client, and Expo mobile client. The next implementation increment should make the API authoritative: authenticated identity, versioned consents, deterministic risk/goal/bucket services, explicit `MOCK` provider adapters, and connected web journey. Regulated providers remain `NOT CONFIGURED — CREDENTIAL REQUIRED` until official documentation and authorised credentials are supplied.
