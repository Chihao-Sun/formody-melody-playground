const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(process.argv[2],'utf8'),root=path.resolve(__dirname,'../miniprogram/assets/icons');fs.mkdirSync(root,{recursive:true});
const specs={
  'sound-on':[/<svg class="sound-on"[\s\S]*?<\/svg>/,'#fff8ec'],
  'sound-off':[/<svg class="sound-off"[\s\S]*?<\/svg>/,'#fff8ec'],
  'settings':[/<button id="settings"[^>]*>(<svg[\s\S]*?<\/svg>)/,'#fff8ec'],
  'entry-ripple':[/<svg class="entry-ripple"[\s\S]*?<\/svg>/,'#355b64'],
  'entry-arrow':[/<svg class="entry-arrow"[\s\S]*?<\/svg>/,'#355b64'],
  'skip':[/<div class="gesture-option">(<svg[\s\S]*?<\/svg>)/,'#fff6e5'],
  'lob':[/<\/div><div class="gesture-option">(<svg[\s\S]*?<\/svg>)/,'#fff6e5'],
  'seek':[/<span class="seek-pill">(<svg[\s\S]*?<\/svg>)/,'#355b64'],
  'lake-guide':[/<figure class="lake-guide">(<svg[\s\S]*?<\/svg>)/,null],
};
for(const [name,[pattern,color]]of Object.entries(specs)){
  const match=source.match(pattern);if(!match)throw new Error('Missing source icon '+name);
  let svg=match[1]||match[0];svg=svg.replace(/<svg\b/,`<svg xmlns="http://www.w3.org/2000/svg"${color?' fill="none" stroke="'+color+'" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"':''}`);
  if(color)svg=svg.replaceAll('currentColor',color);
  svg=svg.replaceAll('class="gesture-water"','opacity=".35" stroke-width="1"');
  fs.writeFileSync(path.join(root,name+'.svg'),svg+'\n');
}
