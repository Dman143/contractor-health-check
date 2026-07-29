# Contractor Health Check

Version 3 of a responsive React, TypeScript, and Tailwind CSS SaaS-style web application that helps small to medium contractors assess the health of their business and unlock a premium growth report.

## Features

- Premium V3 landing page with SaaS positioning and a clear Start Assessment CTA
- Lead-capture profile step for name, company, email, optional phone, trade, team size, and monthly revenue
- 25-question assessment across eight contractor business categories
- One-question-per-screen flow with 1–5 scoring and a progress bar
- Business Health Score out of 100
- Professional results page with category benchmarks, top strengths, top opportunities, a recommended 30-day playbook, and SaaS conversion CTAs
- Backend email workflow that sends completed reports to your configured Gmail inbox

## Email Workflow

When a visitor completes the assessment and clicks **Email My Report**, the React app posts the lead profile, score, category scores, strengths, opportunities, recommended next steps, and completion date to the production server endpoint:

```text
POST /api/email-report
```

The server sends the report through SMTP using environment variables only. No email credentials are hardcoded in the codebase.

### Required Environment Variables

Create a `.env` file locally or configure these values in your production host:

```bash
SMTP_USER=your-sending-gmail-address@gmail.com
SMTP_PASS=your-gmail-app-password
REPORT_RECIPIENT_EMAIL=your-inbox@gmail.com
```

For Gmail, `SMTP_PASS` should be an app password for the Gmail account used as `SMTP_USER`.

### Optional Environment Variables

```bash
PORT=4174
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_EHLO_DOMAIN=contractor-health-check.local
REPORT_FROM_EMAIL=your-sending-gmail-address@gmail.com
```

`REPORT_FROM_EMAIL` defaults to `SMTP_USER` when omitted. Keep `SMTP_SECURE=true` with Gmail on port `465`.

## Preview Locally

Install dependencies:

```bash
npm install
```

Run the Vite frontend and the email server in two terminals:

```bash
npm run dev
```

```bash
npm run dev:server
```

Then open the local URL printed by Vite, usually <http://localhost:5173/>. Vite proxies `/api` requests to the backend server on port `4174`.

## Production Build

Build the static frontend:

```bash
npm run build
```

Start the production server after configuring the required environment variables:

```bash
npm start
```

The Node server exposes `/api/email-report` and serves the built Vite app from `dist/`.
