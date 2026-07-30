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

`/api/consulting-insights` sends the completed business profile, scorecard, strongest and weakest categories, and benchmark gaps to OpenAI and returns a structured consulting report. The API key and prompt remain on the server. `/api/email-report` delivers the complete lead assessment to the TradeBuilt recipient and attaches the generated PDF. The contractor's submitted address is used as the reply-to address. `/api/strategy-session` sends strategy requests to the same recipient with the contractor's address set as the reply-to contact. Both email endpoints default to `daniel@tradebuilt.pro`.

### Production environment variables

```bash
SMTP_USER=daniel@tradebuilt.pro
SMTP_PASS=your-app-password
OPENAI_API_KEY=your-openai-api-key
TRADEBUILT_RECIPIENT_EMAIL=daniel@tradebuilt.pro
```

`OPENAI_API_KEY` enables live AI-generated consulting insights. When it is absent, the server automatically returns a personalized, deterministic consulting plan derived from the assessment scores, so local development requires no `.env` file. `SMTP_USER` and `SMTP_PASS` are only required for email delivery. Keep production credentials in encrypted environment variables; never use a `VITE_` prefix for the OpenAI key. `TRADEBUILT_RECIPIENT_EMAIL` is the single optional routing override for both assessment reports and strategy-session requests; it defaults to `daniel@tradebuilt.pro`. The application defaults are centralized in `server/config.mjs`. For Gmail, use an app password for `SMTP_PASS`.

### Optional environment variables

```bash
PORT=4174
OPENAI_MODEL=gpt-5-mini
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
