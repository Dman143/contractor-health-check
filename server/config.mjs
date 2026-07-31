export const brand = Object.freeze({
  name: 'TradeBuilt',
  domain: 'tradebuilt.pro',
  contactEmail: 'daniel@tradebuilt.pro',
  emailSenderName: 'TradeBuilt Growth',
});

const env = (name) => process.env[name]?.trim();
const smtpPassword = () => {
  const value = env('SMTP_PASS');
  // Google presents app passwords in four groups. Copying that display verbatim
  // is a common production-only authentication failure.
  if (env('SMTP_HOST')?.toLowerCase() === 'smtp.gmail.com' && value?.replace(/\s/g, '').length === 16) {
    return value.replace(/\s/g, '');
  }
  return value;
};

export const getConfig = () => Object.freeze({
  port: Number(process.env.PORT ?? 4174),
  openai: Object.freeze({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
  }),
  environment: process.env.NODE_ENV ?? 'development',
  assessmentRecipientEmail: env('TRADEBUILT_RECIPIENT_EMAIL'),
  smtp: Object.freeze({
    host: env('SMTP_HOST'),
    port: Number(env('SMTP_PORT')),
    secure: env('SMTP_SECURE') === 'true',
    secureRaw: env('SMTP_SECURE'),
    username: env('SMTP_USER'),
    password: smtpPassword(),
    fromEmail: env('SMTP_FROM_EMAIL'),
    ehloDomain: env('SMTP_EHLO_DOMAIN'),
  }),
});
