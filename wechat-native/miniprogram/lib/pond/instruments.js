// Native snapshot of verified Sites v51. See provenance.json.
// Screen-normalized lake geography, shared by hit selection and its legend.
const INSTRUMENT_ZONES=[
 {part:'pluck',label:'近岸 · 拨弦',name:'拨弦',x:.5,y:.78},
 {part:'bass',label:'低弦',name:'低弦',x:.18,y:.60},
 {part:'pad',label:'弦乐',name:'弦乐',x:.50,y:.60},
 {part:'bell',label:'钟琴',name:'钟琴',x:.82,y:.60},
 {part:'bloom',label:'远处 · 空灵管乐',name:'空灵管乐',x:.50,y:.44},
];
function instrumentAt(x,y){
 const part=y>=.69?'pluck':y<.50?'bloom':x<.35?'bass':x>.65?'bell':'pad';
 return INSTRUMENT_ZONES.find(zone=>zone.part===part);
}

module.exports={INSTRUMENT_ZONES,instrumentAt};
