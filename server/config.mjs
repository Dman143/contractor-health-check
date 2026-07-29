export const brand = Object.freeze({
  name: 'TradeBuilt',
  domain: 'tradebuilt.pro',
  contactEmail: 'daniel@tradebuilt.pro',
  emailSenderName: 'TradeBuilt Growth',
});

export const getConfig = () => Object.freeze({
  port: Number(process.env.PORT ?? 4174),
  assessmentRecipientEmail: process.env.TRADEBUILT_RECIPIENT_EMAIL ?? brand.contactEmail,
  smtp: Object.freeze({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? 'true') !== 'false',
    username: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    fromEmail: process.env.REPORT_FROM_EMAIL ?? process.env.SMTP_USER,
    ehloDomain: process.env.SMTP_EHLO_DOMAIN ?? brand.domain,
  }),
});
