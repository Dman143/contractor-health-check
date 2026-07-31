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
  assessmentRecipientEmail: process.env.TRADEBUILT_RECIPIENT_EMAIL ?? process.env.REPORT_RECIPIENT_EMAIL ?? process.env.EMAIL_TO ?? brand.contactEmail,
  assessmentRecipientSource: process.env.TRADEBUILT_RECIPIENT_EMAIL ? 'TRADEBUILT_RECIPIENT_EMAIL' : process.env.REPORT_RECIPIENT_EMAIL ? 'REPORT_RECIPIENT_EMAIL' : process.env.EMAIL_TO ? 'EMAIL_TO' : 'brand default',
  smtp: Object.freeze({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? 'true') !== 'false',
    username: process.env.SMTP_USER ?? process.env.SMTP_USERNAME ?? process.env.EMAIL_USER,
    password: process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? process.env.EMAIL_PASS,
    usernameSource: process.env.SMTP_USER ? 'SMTP_USER' : process.env.SMTP_USERNAME ? 'SMTP_USERNAME' : process.env.EMAIL_USER ? 'EMAIL_USER' : undefined,
    passwordSource: process.env.SMTP_PASS ? 'SMTP_PASS' : process.env.SMTP_PASSWORD ? 'SMTP_PASSWORD' : process.env.EMAIL_PASS ? 'EMAIL_PASS' : undefined,
    fromEmail: process.env.REPORT_FROM_EMAIL ?? process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER ?? process.env.SMTP_USERNAME ?? process.env.EMAIL_USER,
    ehloDomain: process.env.SMTP_EHLO_DOMAIN ?? brand.domain,
  }),
});
