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

`/api/email-report` delivers the complete lead assessment to the TradeBuilt recipient and attaches the generated PDF. The contractor's submitted address is used as the reply-to address. `/api/strategy-session` sends strategy requests to the same recipient with the contractor's address set as the reply-to contact. Both endpoints default to `daniel@tradebuilt.pro`.

### Required environment variables

```bash
SMTP_USER=daniel@tradebuilt.pro
SMTP_PASS=your-app-password
TRADEBUILT_RECIPIENT_EMAIL=daniel@tradebuilt.pro
```

Only `SMTP_USER` and `SMTP_PASS` are required for delivery. `TRADEBUILT_RECIPIENT_EMAIL` is the single optional routing override for both assessment reports and strategy-session requests; it defaults to `daniel@tradebuilt.pro`. The application defaults are centralized in `server/config.mjs`. For Gmail, use an app password for `SMTP_PASS`.

### Optional environment variables

```bash
PORT=4174
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_EHLO_DOMAIN=tradebuilt.pro
REPORT_FROM_EMAIL=daniel@tradebuilt.pro
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
