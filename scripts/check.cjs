const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
for(const file of ['config.js','transport.js','inspection.js','history.js','history-core.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
for(const file of ['index.html','history.html']) {
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new vm.Script(match[1],{filename:file});
  for(const match of html.matchAll(/(?:src|href)="([^"#?]+\.(?:js|css|html))"/g))assert(fs.existsSync(path.join(root,match[1])),file+': missing '+match[1]);
  assert(!/老闆看板|管理看板/.test(html));
}
const H=require('../history-core.js'),now=new Date('2026-11-20T10:01:00Z'); // Friday 18:01 Taipei
const normal={date:'2026-11-16',time:'06:00:00',shift:'6:00',noise:'正常',leak:'正常',pipe:'正常',waterLevel:'正常'};
const records=[normal,{...normal,time:'06:15:00'},{...normal,date:'2026-11-20',shift:'12:00',noise:'異常',pWaterAlert:'需補P水'}];
const sum=H.summarize(records,now);
assert.equal(sum.weekStart,'2026-11-16');assert.equal(sum.today,'2026-11-20');
assert.equal(sum.missingCount,17); // 4 past days + 3 elapsed slots today, minus two completed slots
assert.equal(sum.abnormalCount,1);assert.equal(sum.pWaterCount,1);
assert(!sum.missing.some(x=>x.date==='2026-11-20'&&x.shift==='收尾'));
assert(!H.expired('2026-11-20','06:00',new Date('2026-11-19T23:00:00Z')));
assert(H.expired('2026-11-20','06:00',new Date('2026-11-19T23:01:00Z')));
assert.equal(H.summarize([],new Date('2026-11-20T01:00:00Z')).missingCount,1);
assert.equal(H.clock(new Date('2026-11-20T16:01:00Z')).date,'2026-11-21');
assert.equal(H.group(records).get('2026-11-16').length,2);
assert.equal(H.media('https://drive.google.com/file/d/abc123/view#video','清潔')[0].preview,'https://drive.google.com/file/d/abc123/preview');
assert.equal(H.media('javascript:alert(1)','拒絕').length,0);
assert.equal(H.media('https://evil.example/x','拒絕').length,0);
assert.equal(H.media('無','空白').length,0);
assert.equal(H.validDate('2026-02-30'),false);
console.log('PASS: syntax, assets, Taipei midnight, deadlines, weekly misses, duplicate slots, media URLs, legacy shift normalization');
