# TradeBuilt Contractor Health Check

The current TradeBuilt Contractor Health Check is a focused assessment for trade contractors. Its ordered registry contains 20 approved questions; the crew/staff question is conditional, so solo contractors answer 19 applicable questions.

## Current product contract

The six health areas, in order, are:

1. Delivery & Workmanship
2. Client Experience & Communication
3. Commercial Control
4. Financial Control
5. Demand & Positioning
6. Capacity & Direction

The application must not show contractors a numerical score, compare them with peers, generate a diagnosis, or generate an action plan. Answers and internal scoring are retained for Daniel, who personally reviews every completed Health Check. The contractor receives a simple completion confirmation and can download the approved TradeBuilt Quick Guide while waiting.

The approved question wording and answer options in `src/data.ts` are the source of truth. Historical V1 compatibility code must not be used to redefine or migrate the current registry.

## Submission and email delivery

The browser submits the completed assessment to two same-origin endpoints:

```text
POST /api/engine-ingestion
POST /api/email-report
```

Engine ingestion is non-blocking and optional. The email route sends Daniel the full review record—including the applicable answers, context, internal results, and internal PDF—and separately sends the contractor a score-free receipt with a link to the existing Quick Guide. The review recipient defaults through deployment configuration to `daniel@tradebuilt.pro`.

### Production environment variables

```bash
SMTP_USER=daniel@tradebuilt.pro
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=daniel@tradebuilt.pro
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_EHLO_DOMAIN=tradebuilt.pro
TRADEBUILT_RECIPIENT_EMAIL=daniel@tradebuilt.pro
```

All SMTP variables above are required. Keep credentials in encrypted environment variables and never use a `VITE_` prefix for secrets. Gmail app-password spaces are normalized before authentication. Runtime diagnostics report presence and format validity without logging values.

## Quick Guide

`public/tradebuilt-quick-guide.pdf` is the approved, already-working binary asset. Do not parse, modify, regenerate, or replace it. The production build verification checks that it is copied unchanged into `dist/`.

## Local development

```bash
npm install
npm run dev
```

The development command starts Vite and the API server. Vite proxies `/api` requests to port 4174. Use `npm run dev:frontend` only when running the API separately.

## Production

```bash
npm run build
npm start
```

The Node server serves `dist/` and handles the submission endpoints. On Vercel, files in `api/` expose the same relative URLs as serverless functions.
