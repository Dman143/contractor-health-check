import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../public/tradebuilt-quick-guide.pdf', import.meta.url));
const built = readFileSync(new URL('../dist/tradebuilt-quick-guide.pdf', import.meta.url));

if (!source.equals(built)) {
  throw new Error('Production build does not contain the approved TradeBuilt Quick Guide PDF.');
}

console.log('TradeBuilt production assets verified.');
