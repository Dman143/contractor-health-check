import { readFileSync } from 'node:fs';
const data=readFileSync(new URL('../src/data.ts',import.meta.url),'utf8'); const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8'); const assessment=readFileSync(new URL('../src/assessment.ts',import.meta.url),'utf8'); const server=readFileSync(new URL('../server/index.mjs',import.meta.url),'utf8');
const tracks=['Delivery & Workmanship','Client Experience & Reputation','Commercial Control','Financial Control','Demand & Positioning','Capacity & Direction']; tracks.forEach(track=>{if(!data.includes(track))throw new Error(`Missing V2 track: ${track}`)});
for(const text of ['tradebuilt-contractor-health-check-v2.0','TB-CAP-01','TB-FIN-03']) if(!(data+assessment+server).includes(text)) throw new Error(`Missing V2 contract content: ${text}`);
if(!data.includes('Not applicable — clients normally buy materials directly')) throw new Error('Missing materials N/A option.');
for(const text of ['Strongest areas','Weakest areas','Likely risks','Priority investigation areas','Areas requiring deeper evidence']) if(!app.includes(text)) throw new Error(`Missing V2 result section: ${text}`);
const v2Email=server.slice(server.indexOf('const formatReportEmail'),server.indexOf('const logEmailRoute')); if(/Industry Average|Quick wins|30-Day Action Plan/i.test(app+v2Email)) throw new Error('V1 benchmark or paid action-plan content leaked into V2 output.');
console.log('TradeBuilt V2 content smoke test passed.');
