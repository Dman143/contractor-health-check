# TradeBuilt

TradeBuilt is a contractor growth platform that turns a focused 25-question business assessment into a benchmarked scorecard, AI-generated consulting insights, and a practical 30-day action plan.

## Product experience

- Contractor-specific business profile and assessment across eight operating categories
- Business Health Score with unchanged peer benchmarks, strengths, and constraints
- Personalized contractor consulting report generated with the OpenAI Responses API in production and a deterministic local fallback when no API key is configured
- Polished, multi-page PDF report generated in the browser
- Branded email report delivered directly to the contractor
- Strategy-session requests routed to the TradeBuilt advisory inbox
- Responsive dark interface built with React, TypeScript, and Tailwind CSS

## Email delivery

The production server exposes one OpenAI-backed endpoint and two SMTP-backed endpoints:

```text
POST /api/consulting-insights
POST /api/email-report
POST /api/strategy-session
```

`/api/consulting-insights` sends the completed business profile, scorecard, benchmark gaps, and compact category-grouped answers to OpenAI and returns a structured consulting report. The API key and prompt remain on the server. `/api/email-report` sends the attached PDF to the contractor and blind-copies the configured TradeBuilt recipient. `/api/strategy-session` sends strategy requests to that recipient with the contractor's address set as the reply-to contact. The recipient defaults to `daniel@tradebuilt.pro`.

### Production environment variables

```bash
SMTP_USER=daniel@tradebuilt.pro
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=daniel@tradebuilt.pro
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_EHLO_DOMAIN=tradebuilt.pro
OPENAI_API_KEY=your-openai-api-key
TRADEBUILT_RECIPIENT_EMAIL=daniel@tradebuilt.pro
```

`OPENAI_API_KEY` enables live AI-generated consulting insights. When it is absent, the server automatically returns a personalized, deterministic consulting plan derived from the assessment scores, so local development requires no `.env` file. All eight SMTP variables shown above are required for email delivery. Keep production credentials in encrypted environment variables; never use a `VITE_` prefix for secrets. Runtime diagnostics report only each variable's presence, format validity, and load status; values are never logged. For Gmail, use an app password for `SMTP_PASS`; spaces copied from Google's grouped app-password display are normalized before authentication.

### Optional environment variables

```bash
PORT=4174
OPENAI_MODEL=gpt-5-mini
```

The SMTP settings have no implicit production defaults so a deployment cannot silently use the wrong server or sender.

## Local development

```bash
npm install
npm run dev
```

The development command starts both Vite and the API server. Vite proxies `/api`
requests to the server on port 4174. Use `npm run dev:frontend` only when the API
is deliberately being run separately. No API key or `.env` file is needed to complete
an assessment locally; add `OPENAI_API_KEY` only when you want to exercise the live
OpenAI integration.

## Production

```bash
npm run build
npm start
```

The Node server serves the production build from `dist/` and handles both email endpoints.

On Vercel, the files in `api/` expose the same relative `/api/*` URLs as deployed
serverless functions. The browser therefore uses same-origin requests in both local
development and production; the localhost address in `vite.config.ts` is only the
Vite development proxy target and is not included in the production request URL.
