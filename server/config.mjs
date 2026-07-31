export const brand = Object.freeze({
  name: 'TradeBuilt',
  domain: 'tradebuilt.pro',
  contactEmail: 'daniel@tradebuilt.pro',
  emailSenderName: 'TradeBuilt Growth',
});

export const getConfig = () => Object.freeze({
  port: Number(process.env.PORT ?? 4174),
  openai: Object.freeze({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
  }),
  environment: process.env.NODE_ENV ?? 'development',
  assessmentRecipientEmail: process.env.TRADEBUILT_RECIPIENT_EMAIL,
  smtp: Object.freeze({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    secureRaw: process.env.SMTP_SECURE,
    username: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    fromEmail: process.env.SMTP_FROM_EMAIL,
    ehloDomain: process.env.SMTP_EHLO_DOMAIN ?? brand.domain,
  }),
});
