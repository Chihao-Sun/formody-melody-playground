import { DURATION, MAX_DROPS, BEAT, PHASES, clamp, smooth, phaseAt, envelope, makeDrop, flightPoint } from './core.js';
import { regularPolygon } from '../math/outer-billiards.js';
import { RippleAudio } from './audio.js';
import { RippleSurface } from './surface.js';

const $ = id => document.getElementById(id);
const canvas = $('ink'), ctx = canvas.getContext('2d');
const surface = new RippleSurface($('surface'));
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
let width = innerWidth, height = innerHeight, pixelRatio = 1;
let drops = [], flights = [], nextId = 1, drag = null, lastThrow = -10;
let noticeUntil = 0, lastPhase = '', frameId, lastPaint = -1;
let target = { x: .51, y: .47 };
const audio = new RippleAudio(() => drops, syncControls);
function notice(message) { $('notice').textContent = message; noticeUntil = performance.now() + 4200; }
function syncControls() {
  $('sound').setAttribute('aria-pressed', String(!audio.muted));
  $('sound').setAttribute('aria-label', !audio.context || audio.muted ? '开启声音' : '关闭声音');
  $('sound').querySelector('.sound-text').textContent = audio.muted ? '声音已关' : audio.context?.state === 'running' ? '声音已开' : '声音待开启';
  $('pause').textContent = audio.paused ? '▶' : 'Ⅱ';
  $('pause').setAttribute('aria-label', audio.paused ? '继续画面与声音' : '暂停画面与声音');
  document.body.classList.toggle('paused', audio.paused);
}
async function activate() {
  try { if (audio.paused) await audio.setPaused(false); await audio.unlock(); }
  catch (error) { notice(error.message || '声音未能开启，可再次点击声音按钮；画面仍可体验。'); }
}
function resize() {
  width = innerWidth; height = innerHeight; pixelRatio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0); surface.resize(width,height);
  // Resizing cancels an in-progress gesture rather than releasing at stale coordinates.
  drag = null; canvas.classList.remove('dragging'); lastPaint = -1;
}
addEventListener('resize', resize); resize();
function dock() { return { x: width * .5, y: height * .64 }; }
function position(e) { const r = canvas.getBoundingClientRect(); return { x: clamp(e.clientX-r.left,0,width), y: clamp(e.clientY-r.top,0,height) }; }
function launch(destination, strength = .7, from = dock()) {
  const now = audio.now();
  drops = drops.filter(d => now - d.start < DURATION);
  if (now-lastThrow < .4) return;
  if (drops.length >= MAX_DROPS) { notice('已有四颗小球在合奏，留一点空间听它们展开。'); return; }
  lastThrow = now;
  const to = { x: clamp(destination.x / width,.08,.92), y: clamp(destination.y / height,.19,.76) };
  const duration = reducedQuery.matches ? .28 : .72;
  const drop = makeDrop(to.x,to.y,strength,now+duration,nextId++);
  drops.push(drop); flights.push({ from: { x: from.x/width,y:from.y/height }, to, start:now, duration, strength, id:drop.id });
  document.body.classList.add('active');
  if (!drop.motif.length) notice('这一数学起点落在未定义的切线上；保留涟漪，不生成替代旋律。');
  audio.schedule();
}
canvas.addEventListener('pointerdown', e => {
  if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault(); activate(); canvas.focus({ preventScroll:true });
  const p=position(e); drag={ id:e.pointerId,from:p,to:p,start:performance.now() };
  canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', e => { if (drag?.id===e.pointerId) drag.to=position(e); });
function endDrag(e, cancelled=false) {
  if (!drag || drag.id!==e.pointerId) return;
  const d=drag; drag=null; canvas.classList.remove('dragging');
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  if (cancelled) return;
  const end=position(e), dx=end.x-d.from.x, dy=end.y-d.from.y;
  const distance=Math.hypot(dx,dy), duration=Math.max(80,performance.now()-d.start);
  const strength=clamp(.22+distance/Math.min(width,height)*1.25+distance/duration*.18,.22,1);
  const destination=distance<10 ? end : {x:end.x+dx*.30,y:end.y+dy*.30};
  launch(destination,strength,distance<10?dock():d.from);
}
canvas.addEventListener('pointerup',e=>endDrag(e));
canvas.addEventListener('pointercancel',e=>endDrag(e,true));
canvas.addEventListener('lostpointercapture', e => { if(drag?.id===e.pointerId){drag=null;canvas.classList.remove('dragging');} });
canvas.addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
    e.preventDefault(); target.x=clamp(target.x+(e.key==='ArrowRight'?.035:e.key==='ArrowLeft'?-.035:0),.08,.92);
    target.y=clamp(target.y+(e.key==='ArrowDown'?.035:e.key==='ArrowUp'?-.035:0),.19,.76); lastPaint=-1;
  } else if(e.key===' '||e.key==='Enter'){e.preventDefault();activate();launch({x:target.x*width,y:target.y*height},.76);}
  else if(e.key==='Escape'){drag=null;canvas.classList.remove('dragging');}
});
$('demo').addEventListener('click',()=>{activate();launch({x:width*target.x,y:height*target.y},.82);});
$('sound').addEventListener('click',()=>{audio.setMuted(audio.context ? !audio.muted : false);activate();});
$('pause').addEventListener('click',()=>audio.setPaused(!audio.paused).catch(()=>notice('请再次点击继续，恢复声音。')));
$('reset').addEventListener('click',()=>{
  drops=[];flights=[];drag=null;lastThrow=-10;lastPhase='';audio.clear();
  document.body.classList.remove('active');$('notice').textContent='';lastPaint=-1;
  canvas.classList.remove('dragging');
});
$('about').addEventListener('click',()=>$('about-dialog').showModal());
$('close-about').addEventListener('click',()=>$('about-dialog').close());
$('about-dialog').addEventListener('click',e=>{if(e.target===$('about-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){drag=null;audio.setPaused(true).catch(()=>{});cancelAnimationFrame(frameId);}
  else {lastPaint=-1;frameId=requestAnimationFrame(frame);}
});
addEventListener('pagehide',()=>{audio.setPaused(true).catch(()=>{});cancelAnimationFrame(frameId);});
addEventListener('pageshow',()=>{cancelAnimationFrame(frameId);frameId=requestAnimationFrame(frame);});
function sphere(x,y,r,alpha=1){
  ctx.save();ctx.globalAlpha=alpha;
  let g=ctx.createRadialGradient(x,y,0,x,y,r*5);g.addColorStop(0,'#a6cfff55');g.addColorStop(.3,'#8bb4ff22');g.addColorStop(1,'#8bb4ff00');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*5,0,Math.PI*2);ctx.fill();
  g=ctx.createRadialGradient(x-r*.35,y-r*.45,r*.08,x+r*.15,y+r*.12,r*1.3);
  g.addColorStop(0,'#fffef2');g.addColorStop(.24,'#dfe5ff');g.addColorStop(.51,'#a9bce6');g.addColorStop(.77,'#526b9f');g.addColorStop(1,'#243450');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#d7e1ff99';ctx.lineWidth=.7;ctx.stroke();ctx.restore();
}
function drawIdle(now){
  const d=dock(), r=Math.min(width,height)*.15;
  ctx.save();ctx.lineWidth=.65;
  for(let i=0;i<4;i++){
    ctx.strokeStyle=`rgba(133,169,213,${.20-i*.035})`;
    ctx.beginPath();ctx.ellipse(d.x,d.y+23,r*(1+i*.52),r*.31*(1+i*.52),0,0,Math.PI*2);ctx.stroke();
  }
  // Five vertices are a quiet reference to the existing mathematical study.
  const points=regularPolygon(5,r*.50,-Math.PI/2);ctx.beginPath();
  points.forEach((p,i)=>i?ctx.lineTo(d.x+p.x,d.y+23+p.y*.31):ctx.moveTo(d.x+p.x,d.y+23+p.y*.31));ctx.closePath();ctx.strokeStyle='#91a7d028';ctx.stroke();
  sphere(d.x,d.y-7+Math.sin(now*.85)*(reducedQuery.matches?0:2.5),11);
  ctx.textAlign='center';ctx.font='10px "Microsoft YaHei",sans-serif';ctx.fillStyle='#8e9ebc';ctx.fillText('按住小球，向前轻掷',d.x,d.y+r*.7+40);ctx.restore();
}
function drawGeometry(d,now){
  const age=now-d.start;if(age<0||age>DURATION)return;
  const env=envelope(age),growth=smooth(3,15,age),mist=smooth(21,30,age);
  const cx=d.x*width,cy=d.y*height,unit=Math.min(width,height);
  const radius=unit*(.04+growth*.23);
  const maxRadius=Math.max(1,...d.orbit.points.map(p=>Math.hypot(p.x,p.y)));
  const scale=radius/maxRadius;
  const visible=Math.min(d.orbit.points.length,Math.floor(3+age*age*1.7));
  ctx.save();ctx.lineWidth=.55;ctx.strokeStyle=`rgba(183,211,242,${env*(1-mist)*.16})`;
  ctx.beginPath();for(let i=0;i<visible;i++){const p=d.orbit.points[i],x=cx+p.x*scale,y=cy-p.y*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
  ctx.beginPath();regularPolygon().forEach((p,i)=>i?ctx.lineTo(cx+p.x*scale,cy-p.y*scale):ctx.moveTo(cx+p.x*scale,cy-p.y*scale));ctx.closePath();ctx.strokeStyle=`rgba(207,223,250,${env*(1-mist)*.35})`;ctx.stroke();
  const pulse=Math.exp(-((age%(BEAT/2))/(BEAT/2))*4);
  sphere(cx,cy,2.5+pulse*1.6,env*(1-mist)*.55);
  // Short impact rings remain legible before the harmonic field grows.
  if(age<5){
    for(let i=0;i<3;i++){const r=(age-i*.22)*unit*.073;if(r<=0)continue;ctx.beginPath();ctx.ellipse(cx,cy,r,r*.78,0,0,Math.PI*2);ctx.lineWidth=1-i*.2;ctx.strokeStyle=`rgba(189,220,252,${(1-age/5)*(.35-i*.08)})`;ctx.stroke();}
  }
  ctx.restore();
}
function drawFlights(now){
  flights=flights.filter(f=>now-f.start<f.duration);
  for(const f of flights){
    const from={x:f.from.x*width,y:f.from.y*height},to={x:f.to.x*width,y:f.to.y*height};
    const t=(now-f.start)/f.duration,lift=height*(reducedQuery.matches?.02:.12+.07*f.strength);
    ctx.beginPath();for(let j=0;j<=20;j++){const p=flightPoint(from,to,Math.max(0,t-j*.012),lift);j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
    ctx.strokeStyle='#bdcfff66';ctx.lineWidth=1.2;ctx.stroke();
    const p=flightPoint(from,to,t,lift);sphere(p.x,p.y,10*(1-t*.68));
  }
}
function drawGesture(){
  if(!drag)return;const a=drag.from,b=drag.to;
  ctx.save();ctx.setLineDash([3,6]);ctx.strokeStyle='#cbddff66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(b.x,b.y,20,0,Math.PI*2);ctx.strokeStyle='#b9d1f044';ctx.stroke();sphere(b.x,b.y,11);ctx.restore();
}
function syncPhase(now){
  const active=drops.filter(d=>now>=d.start&&now<d.start+DURATION);
  const d=active.at(-1);
  if(!d){if(!flights.length&&!drops.some(d=>now<d.start))document.body.classList.remove('active');return;}
  const phase=phaseAt(now-d.start),key=`${d.id}/${phase}`;if(key===lastPhase)return;lastPhase=key;
  const [en,name,description]=PHASES[phase];$('phase-kicker').textContent=`0${phase+1} / ${en}`;$('phase-name').textContent=name;$('phase-description').textContent=description;
  document.querySelectorAll('.journey>span').forEach((el,i)=>{el.classList.toggle('current',i===phase);el.classList.toggle('past',i<phase);});
  document.querySelector('.journey-label').textContent=`${en} / 0${phase+1}`;
}
function frame(stamp){
  if(document.hidden)return;
  frameId=requestAnimationFrame(frame);
  const now=audio.now(), interval=reducedQuery.matches?1000/20:1000/30;
  if(lastPaint>=0&&((audio.paused&&!drag)||stamp-lastPaint<interval))return;
  lastPaint=stamp;drops=drops.filter(d=>now-d.start<DURATION+.1);
  ctx.clearRect(0,0,width,height);
  surface.draw(now,drops,reducedQuery.matches);
  if(!drops.length&&!drag)drawIdle(now);
  for(const d of drops)drawGeometry(d,now);
  drawFlights(now);drawGesture();syncPhase(now);
  if(document.activeElement===canvas&&!drag){ctx.beginPath();ctx.arc(target.x*width,target.y*height,7,0,Math.PI*2);ctx.strokeStyle='#e1ecff88';ctx.lineWidth=.7;ctx.stroke();}
  if($('notice').textContent&&performance.now()>noticeUntil)$('notice').textContent='';
}
syncControls();frameId=requestAnimationFrame(frame);
// Explicit opt-in diagnostic harness; no network, storage, recording, or user data.
if(new URLSearchParams(location.search).has('check')){
  window.__formody={
    audio,
    snapshot:()=>({time:audio.now(),drops:drops.map(d=>({id:d.id,age:audio.now()-d.start,seed:d.seed,motif:d.motif,status:d.orbit.status})),flights:flights.length,paused:audio.paused,muted:audio.muted,voices:audio.voices.size,events:audio.events,renderer:'canvas-2d',reduced:reducedQuery.matches}),
    seek:(age)=>{audio.clear();const d=drops.at(-1);if(d){d.start=audio.now()-age;flights=[];}lastPaint=-1;},
  };
}
