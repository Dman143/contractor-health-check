# TradeBuilt

TradeBuilt is a contractor growth platform that turns a focused 25-question business assessment into a benchmarked scorecard, consultant-style recommendations, and a practical 30-day action plan.

## Product experience

- Contractor-specific business profile and assessment across eight operating categories
- Business Health Score with peer benchmarks, strengths, constraints, and prioritized actions
- Polished, multi-page PDF report generated in the browser
- Branded email report delivered directly to the contractor
- Strategy-session requests routed to the TradeBuilt advisory inbox
- Responsive dark interface built with React, TypeScript, and Tailwind CSS

## Email delivery

The production server exposes two SMTP-backed endpoints:

```text
POST /api/email-report
POST /api/strategy-session
```

`/api/email-report` delivers the report to the contractor's submitted email address. If `REPORT_RECIPIENT_EMAIL` is configured, TradeBuilt receives a blind copy. `/api/strategy-session` delivers advisory requests to `REPORT_RECIPIENT_EMAIL` with the contractor's address set as the reply-to contact.

### Required environment variables

```bash
SMTP_USER=your-sending-address@gmail.com
SMTP_PASS=your-app-password
REPORT_RECIPIENT_EMAIL=your-advisory-inbox@gmail.com
```

`REPORT_RECIPIENT_EMAIL` is required for strategy-session requests and optional if only report delivery is used. For Gmail, use an app password for `SMTP_PASS`.

### Optional environment variables

```bash
PORT=4174
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_EHLO_DOMAIN=tradebuilt.local
REPORT_FROM_EMAIL=your-sending-address@gmail.com
```

`REPORT_FROM_EMAIL` defaults to `SMTP_USER`. The default SMTP configuration uses a secure connection to Gmail on port 465.

## Local development

```bash
npm install
npm run dev
```

In another terminal, start the API and static server:

```bash
npm run dev:server
```

Vite proxies `/api` requests to the server on port 4174.

## Production

```bash
npm run build
npm start
```

The Node server serves the production build from `dist/` and handles both email endpoints.
