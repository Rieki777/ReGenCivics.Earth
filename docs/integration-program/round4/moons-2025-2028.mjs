import * as A from 'astronomy-engine';
const TZ = 'America/Los_Angeles'; // placeholder village tz for illustration
const fmt = (d, tz) => new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
for (const year of [2025,2026,2027,2028]) {
  const s = A.Seasons(year);
  console.log(`\n== ${year} == equinoxes/solstices (UTC): mar ${s.mar_equinox.date.toISOString()} jun ${s.jun_solstice.date.toISOString()} sep ${s.sep_equinox.date.toISOString()} dec ${s.dec_solstice.date.toISOString()}`);
  let q = A.SearchMoonQuarter(new Date(Date.UTC(year,0,1)));
  const news=[], fulls=[];
  while (q.time.date.getUTCFullYear()===year) {
    if (q.quarter===0) news.push(q.time.date);
    if (q.quarter===2) fulls.push(q.time.date);
    q = A.NextMoonQuarter(q);
  }
  console.log(`new moons: ${news.length}  ` + news.map(d=>d.toISOString().slice(0,10)).join(' '));
  console.log(`full moons: ${fulls.length}  ` + fulls.map(d=>d.toISOString().slice(0,10)).join(' '));
}
// count new moons between successive December solstices (a "solstice year")
for (const y of [2024,2025,2026,2027]) {
  const a = A.Seasons(y).dec_solstice.date, b = A.Seasons(y+1).dec_solstice.date;
  let q = A.SearchMoonQuarter(a); let n=0, f=0;
  while (q.time.date < b) { if(q.quarter===0) n++; if(q.quarter===2) f++; q=A.NextMoonQuarter(q); }
  console.log(`solstice-year ${y}->${y+1}: new moons ${n}, full moons ${f}`);
}
// timezone edge: a new moon near midnight
const q0 = A.SearchMoonQuarter(new Date(Date.UTC(2026,0,1)));
let q=q0; for(let i=0;i<50;i++){ if(q.quarter===0){ const d=q.time.date; const utc=d.toISOString(); const la=fmt(d,'America/Los_Angeles'); const auck=fmt(d,'Pacific/Auckland'); if(la.slice(0,10)!==auck.slice(0,10)) console.log('date differs by tz:',utc,'| LA',la,'| Auckland',auck);} q=A.NextMoonQuarter(q);} 
