import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../public/tradebuilt-quick-guide.pdf', import.meta.url));
const built = readFileSync(new URL('../dist/tradebuilt-quick-guide.pdf', import.meta.url));
const logoSource = readFileSync(new URL('../public/tradebuilt_logo_clean.png', import.meta.url));
const logoBuilt = readFileSync(new URL('../dist/tradebuilt_logo_clean.png', import.meta.url));

if (!source.equals(built)) {
  throw new Error('Production build does not contain the approved TradeBuilt Quick Guide PDF.');
}

if (!logoSource.equals(logoBuilt)) {
  throw new Error('Production build does not contain the approved TradeBuilt logo.');
}

console.log('TradeBuilt production assets verified.');
