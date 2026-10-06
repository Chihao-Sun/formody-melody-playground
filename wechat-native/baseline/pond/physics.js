// World units are metres and seconds. This is an expressive, bounded skipping
// model (gravity + drag + dissipative impacts), not a fluid-dynamics solver.
export const clamp = (v, lo=0, hi=1) => Math.max(lo, Math.min(hi, v));
export function makeStone(seed) {
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const rare=random()<1/6;
  const radius=.075+random()*.072;
  const form=rare?'crystal':['round','oval','flat','faceted'][Math.floor(random()*4)];
  const flatness=form==='flat'?.30+random()*.15:form==='round'?.84+random()*.13:.56+random()*.22;
  const count={round:14,oval:12,flat:11,faceted:8,crystal:7}[form],outline=[];
  const smooth=form==='round'||form==='oval';
  const stretch=form==='oval'?1.18:form==='flat'?1.12:1;
  for(let i=0;i<count;i++){
    const angle=i/count*Math.PI*2,r=smooth?.97+random()*.03:.88+random()*.12;
    outline.push([Math.cos(angle)*r*stretch,Math.sin(angle)*r*flatness/stretch]);
  }
  const rings=smooth?[[.38,-.66],[.79,-.48],[1,0],[.83,.44],[.42,.67]]:
    form==='flat'?[[.64,-.45],[1,0],[.72,.43]]:[[.52,-.56],[1,-.08],[.76,.46]];
  const vertices=[],faces=[];
  for(const [scale,y] of rings)for(const [x,z] of outline)vertices.push([x*scale,y*flatness,z/flatness*scale]);
  for(let ring=0;ring<rings.length-1;ring++)for(let i=0;i<count;i++){
    const a=ring*count+i,b=ring*count+(i+1)%count,c=b+count,d=a+count;
    faces.push([a,b,d],[b,c,d]);
  }
  const top=vertices.length,last=(rings.length-1)*count;
  vertices.push([0,(smooth?.73:.52)*flatness,0],[0,-(smooth?.71:.57)*flatness,0]);
  for(let i=0;i<count;i++)faces.push([top,last+(i+1)%count,last+i],[top+1,i,(i+1)%count]);
  const palette=[{hue:172,name:'青玉色'},{hue:192,name:'湖蓝色'},{hue:210,name:'灰蓝色'},{hue:38,name:'奶油色'},{hue:252,name:'淡紫色'}];
  const tint=palette[Math.floor(random()*palette.length)];
  const pattern=rare?'crystal':['plain','plain','speckled','banded'][Math.floor(random()*4)];
  const descriptions={round:['圆滚滚的卵石','小汤圆般的卵石','饱满的圆石'],oval:['杏仁般的河石','细长的鹅卵石','椭圆的小河石'],flat:['薄薄的水漂石','小饼干般的扁石','扁扁的河石'],faceted:['棱角分明的矿石','小山峰般的矿石','切面交错的矿石'],crystal:['星光切面的晶石','透亮的紫晶石','泛着微光的晶石']};
  const descriptor=descriptions[form][Math.floor(random()*3)];
  const detail=pattern==='speckled'?'细斑':pattern==='banded'?'浅纹带':radius<.095?'小巧':radius>.13?'大颗':'';
  const label=rare?'稀有 · '+descriptor:tint.name+(detail?' · '+detail:'')+' · '+descriptor;
  return {seed:seed>>>0,rare,radius,flatness,form,pattern,label,outline,vertices,faces,hue:rare?265:tint.hue,spin:random()>.5?1:-1,curveEnabled:rare||random()<.20};
}
export function gestureSpin(samples){
  let turn=0,path=0,previous=null;
  for(let i=1;i<samples.length;i++){
    const dx=samples[i].x-samples[i-1].x,dy=samples[i].y-samples[i-1].y,len=Math.hypot(dx,dy);
    if(len<4)continue;
    path+=len;
    if(previous)turn+=Math.atan2(previous.x*dy-previous.y*dx,previous.x*dx+previous.y*dy);
    previous={x:dx,y:dy};
  }
  if(path<90||Math.abs(turn)<Math.PI*.8)return 0;
  return Math.sign(turn)*clamp((Math.abs(turn)-Math.PI*.8)/(Math.PI*1.5));
}
export function releaseGesture(samples, width, height, stone, releasedAt) {
  const curveSpin=gestureSpin(samples);
  if(Math.abs(curveSpin)>.05){const release=samples.filter(p=>releasedAt-p.t<=180);if(release.length>=2)samples=release;}
  const last=samples.at(-1), first=samples[0];
  const recent=samples.filter(p=>releasedAt-p.t<=110);
  let vx=0,vy=0;
  if(recent.length>=2) {
    const t0=recent[0].t, ts=recent.map(p=>(p.t-t0)/1000);
    const mt=ts.reduce((s,v)=>s+v,0)/ts.length;
    const mx=recent.reduce((s,p)=>s+p.x,0)/recent.length, my=recent.reduce((s,p)=>s+p.y,0)/recent.length;
    let divisor=0;
    for(let i=0;i<recent.length;i++){const t=ts[i]-mt;divisor+=t*t;vx+=t*(recent[i].x-mx);vy+=t*(recent[i].y-my);}
    if(divisor>1e-6){vx/=divisor;vy/=divisor;}else{vx=0;vy=0;}
  }
  const unit=Math.min(width,height), speed=Math.hypot(vx,vy)/unit;
  const up=Math.max(0,first.y-last.y)/height;
  // A broad upwards arc raises the elevation; a quick shallow sideways sweep
  // stays low. These are continuous gesture parameters, not selected modes.
  let path=0;for(let i=1;i<samples.length;i++)path+=Math.hypot(samples[i].x-samples[i-1].x,samples[i].y-samples[i-1].y);
  const chord=Math.hypot(last.x-first.x,last.y-first.y);
  const curvature=clamp((path/Math.max(chord,1)-1)*1.5);
  const upwardFraction=Math.max(0,-vy)/Math.max(Math.hypot(vx,vy),1);
  const spinning=Math.abs(curveSpin)>.05;
  const loft=spinning?.12:clamp((up-.04)*2.1+upwardFraction*.52+curvature*up*1.2);
  const power=spinning?Math.max(.55,clamp(speed/2.8)):clamp(speed/2.8);
  if(speed<.08&&!spinning)return {vx:0,vy:0,vz:.6,loft:1,power:0,speed};
  const inertia=Math.sqrt(.105/stone.radius);
  const forward=clamp((3+power*12)*inertia,spinning?14:3,16);
  const heading=.26*width/(height*.82)*Math.tanh(vx/unit);
  const vz=forward*(1-loft*.25);
  return {vx:vz*heading,vy:clamp((.18+loft*(1.4+power))*inertia,0,2.7),vz,loft,power,speed,curveSpin};
}
export function createFlight(stone, gesture, start) {
  return {...start,...gesture,curveSpin:(stone.rare||stone.curveEnabled)?(Math.abs(gesture.curveSpin||0)>.05?gesture.curveSpin:0):0,curveOffset:0,stone,age:0,bounces:0,alive:true,trail:[],distance:0};
}
export function stepFlight(f, elapsed) {
  const impacts=[];
  if(!f.alive || elapsed<=0)return impacts;
  let remaining=Math.min(elapsed,.10);
  while(remaining>1e-7 && f.alive) {
    const dt=Math.min(remaining,1/120);remaining-=dt;f.age+=dt;
    const drag=Math.exp(-(.027/f.stone.radius)*dt);
    f.vx*=drag;f.vz*=drag;
    const oldY=f.y, oldX=f.x, oldZ=f.z,oldCurve=f.curveOffset||0;
    f.x+=f.vx*dt;f.z+=f.vz*dt;f.y+=f.vy*dt-4.905*dt*dt;f.vy-=9.81*dt;
    if(f.curveSpin){
      // A single-direction horizontal arc, never returning across its original line.
      // Perspective-normalized displacement stays legible without leaving the view.
      const baseline=f.x-oldCurve,depth=f.z+2,limit=f.headingLimit??.20;
      const arc=1-Math.exp(-Math.pow(f.age/.85,2));
      const side=Math.sign(f.curveSpin),view=f.viewHalfSpan??limit*1.45;
      const room=Math.max(0,view-side*baseline/depth);
      const amplitude=Math.min(limit*(f.stone.rare?.90:.55),room*.85);
      f.curveOffset=side*Math.abs(f.curveSpin)*amplitude*depth*arc;
      f.x=baseline+f.curveOffset;
    }
    if(f.y<=0 && oldY>0) {
      const fraction=clamp(oldY/(oldY-f.y));
      f.x=oldX+(f.x-oldX)*fraction;f.z=oldZ+(f.z-oldZ)*fraction;f.y=0;f.curveOffset=oldCurve+(f.curveOffset-oldCurve)*fraction;
      const horizontal=Math.hypot(f.vx,f.vz), angle=Math.atan2(-f.vy,horizontal);
      const target=f.stone.rare?6+f.stone.seed%5:2+f.stone.seed%3;
      const shallow=f.bounces===0?angle<.43&&horizontal>4.4:f.skipping;
      const skips=f.loft<.56&&shallow&&f.bounces<target-1;
      f.skipping=skips;
      const strength=clamp((f.stone.radius/.105)**1.5 * Math.hypot(horizontal*.17,f.vy)/7,.12,1);
      impacts.push({x:f.x,z:f.z,strength,index:f.bounces,skips,stone:f.stone});
      f.bounces++;f.distance=f.z;
      if(skips) {
        const retention=f.stone.rare?.94-f.stone.flatness*.035:.84-f.stone.flatness*.12;
        f.vx*=retention;f.vz*=retention;
        f.vy=(1.9+.025*horizontal)*Math.pow(f.stone.rare?.91:.79,f.bounces-1)*(1-f.stone.flatness*.25);
        f.y=.003;
      } else f.alive=false;
    }
    if(f.age>12 || f.z>90 || f.y < -2) f.alive=false;
  }
  f.trail.push({x:f.x,y:f.y,z:f.z});if(f.trail.length>(f.stone.rare?28:9))f.trail.shift();
  return impacts;
}
