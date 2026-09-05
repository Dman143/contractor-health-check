import type { BusinessContext, LeadProfile, ResultsData } from './types.ts';
const safe=(value:string)=>value.normalize('NFKD').replace(/[^\x20-\x7e]/g,'').replace(/([\\()])/g,'\\$1');
const line=(text:string,y:number,size=10,font='F1')=>`BT /${font} ${size} Tf 48 ${y} Td (${safe(text)}) Tj ET`;
const wrap=(text:string,maxLength=88)=>{
 const words=text.split(/\s+/); const lines:string[]=[]; let current='';
 words.forEach(word=>{const next=current?`${current} ${word}`:word;if(next.length>maxLength&&current){lines.push(current);current=word;}else current=next;});
 if(current)lines.push(current); return lines;
};
export const createPdfReport=(lead:LeadProfile,results:ResultsData,context:BusinessContext)=>{
 const lines=['TRADEBUILT CONTRACTOR HEALTH CHECK',results.assessmentVersion,`Prepared for ${lead.name || lead.company}`,`${results.overall}/100`,results.disclaimer,'','SIX HEALTH TRACKS',...results.tracks.map(t=>`${t.track}: ${t.score}/100`),'','STRONGEST AREAS',...results.strengths,'','WEAKEST AREAS',...results.weaknesses,'','LIKELY RISKS',...results.risks,'','PRIORITY INVESTIGATION AREAS',...results.investigationPriorities,'','AREAS REQUIRING DEEPER EVIDENCE',...results.deeperEvidence,'',`Desired model: ${context.desiredModel}`,`Current team: ${context.teamSituation}`,`Stated priority: ${context.priority || 'Not supplied'}`,'','NEXT STEP','A paid TradeBuilt diagnostic can investigate evidence and root causes before recommendations or implementation.'];
 let y=752; const commands=[line(lines[0],y,15,'F2'),line(lines[1],y-=18,9),line(lines[2],y-=17,10),line(lines[3],y-=34,26,'F2')]; y-=29;
 lines.slice(4).forEach(text=>{if(!text){y-=6;return;}const heading=text===text.toUpperCase();wrap(text).forEach(part=>{commands.push(line(part,y,heading?10:9,heading?'F2':'F1'));y-=heading?14:12;});});
 const stream=commands.join('\n'); const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',`<< /Length ${stream.length} >> stream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>']; let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});const x=pdf.length;pdf+=`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n `).join('\n')}\ntrailer << /Size 7 /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
 return {blob:new Blob([pdf],{type:'application/pdf'}),filename:`${(lead.company||'contractor').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-health-check-v2.pdf`,pageCount:1};
};
