// Native snapshot of verified Sites v51. See provenance.json.
const {defaultRuntime}=require('../platform/runtime.js');
const { clamp } = require('./physics.js');
const { movementLevel } = require('./music.js');
const variation=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
function passingWind(t,lane=0){
  const shifted=t+lane*7.7,cycle=Math.floor(shifted/19),local=shifted-cycle*19;
  const start=2+variation(cycle+lane*31)*5,duration=5+variation(cycle+73+lane)*5;
  const progress=(local-start)/duration;
  return {progress,amplitude:progress>0&&progress<1?Math.sin(progress*Math.PI)**2*(.55+variation(cycle+19)*.45):0};
}
// Each real stone keeps a quiet wave source for as long as its part exists.
function stoneEchoes(drops,now){
  const echoes=[],seen=new Set();
  for(const d of drops){
    const id=d.sourceId??d.id;if(seen.has(id)||!d.world||!d.stone)continue;seen.add(id);
    const born=d.born??d.start,age=now-born;if(age<0)continue;
    const together=d.ensembleStart==null?0:Math.min(1,Math.max(0,(now-d.ensembleStart)/1.5));
    const tail=d.finishAt==null?1:clamp((d.finishAt-now)/9);
    const fadeProgress=d.fadeStart==null?0:clamp((now-d.fadeStart)/Math.max(.1,d.finishAt-d.fadeStart));
    const visualFade=(d.visualFadeLevel??1)*(1-fadeProgress*fadeProgress*(3-2*fadeProgress));
    const beat=1;
    const gain=(.30+together*.55)*beat*(d.fadeStart==null?(d.resumeStart!=null?movementLevel(d,now):(.32+.68*tail)):visualFade);
    if(gain<.002)continue;
    const anchors=[d.world,...(d.finalWorld?[d.finalWorld]:[])];
    for(const anchor of anchors){
    const anchorBorn=anchor.born??born;
    const cycle=4.5,index=Math.floor(((d.fadeStart??now)-anchorBorn)/cycle);
    for(let i=Math.max(0,index-2);i<=index;i++)echoes.push({
      ...anchor,stone:d.stone,strength:.40+Math.min(10,d.impacts||1)*.025,
      time:anchorBorn+i*cycle,phase:(d.stone.seed%73)*.1,sides:[5,6,8][d.stone.seed%3],color:d.rippleColor??d.stone.seed%4,
      rare:d.stone.rare,echo:true,gain:gain/Math.sqrt(anchors.length),retiring:d.fadeStart!=null,retiredAt:d.fadeStart,resonance:together,excitement:d.excitement||0,sourceId:id,
    });
    }
  }
  return echoes;
}
function clipWaterSegment(a,b,w,h){
  const dx=b.x-a.x,dy=b.y-a.y;
  if(![a.x,a.y,b.x,b.y].every(Number.isFinite))return null;
  let lo=0,hi=1;
  for(const [p,q] of [[-dx,a.x+2],[dx,w+2-a.x],[-dy,a.y-h*.37],[dy,h+2-a.y]]){
    if(Math.abs(p)<1e-9){if(q<0)return null;continue;}
    const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
    if(lo>hi)return null;
  }
  return [{x:a.x+lo*dx,y:a.y+lo*dy},{x:a.x+hi*dx,y:a.y+hi*dy}];
}
class PondRenderer {
  constructor(canvas, runtime = defaultRuntime()){
    this.runtime=runtime;
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.w=1;this.h=1;
    this.rippleLayer=runtime.offscreen();
    this.lake=canvas.createImage();this.lakeLoaded=false;this.lake.onload=()=>{this.lakeLoaded=true;};this.lake.onerror=()=>runtime.assetError('湖面图片加载失败');this.lake.src='/assets/lake.png';
    this.camera={x:0,y:0};
  }
  resize(w,h){this.w=w;this.h=h;this.dpr=Math.min(this.runtime.pixelRatio()||1,1.7,1800/Math.max(w,h));this.canvas.width=Math.round(w*this.dpr);this.canvas.height=Math.round(h*this.dpr);this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);if(this.rippleLayer){this.rippleLayer.width=this.canvas.width;this.rippleLayer.height=this.canvas.height;this.rippleLayer.getContext('2d').setTransform(this.dpr,0,0,this.dpr,0,0);}}
  project(x,y,z){const depth=z+2,f=this.h*.82;return {x:this.w/2+x*f/depth-this.camera.x*(5+35/depth),y:this.h*.367+(1.9-y)*f/depth+this.camera.y*8,scale:f/depth};}
  unproject(x,y){const z=1,f=this.h*.82;return {x:(clamp(x,this.w*.18,this.w*.82)-this.w/2)*(z+2)/f,y:clamp(1.9-(y-this.h*.367)*(z+2)/f,.55,1.3),z};}
  polygon(points,color,alpha=1){const c=this.ctx;c.globalAlpha=alpha;c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill();c.globalAlpha=1;}
  stone(stone,x,y,r,angle=0,held=false,opacity=1){
    const c=this.ctx,yaw=angle*.75+.3,pitch=stone.rare?.48:.48+Math.sin(angle*.3)*.2;
    const points=stone.vertices.map(([vx,vy,vz])=>{
      const a=vx*Math.cos(yaw)+vz*Math.sin(yaw),b=-vx*Math.sin(yaw)+vz*Math.cos(yaw);
      return [a,vy*Math.cos(pitch)-b*Math.sin(pitch),vy*Math.sin(pitch)+b*Math.cos(pitch)];
    });
    if(held||stone.rare){c.save();c.globalAlpha=opacity;const glow=c.createRadialGradient(x,y,0,x,y,r*2.2);glow.addColorStop(0,stone.rare?'#ffebca78':'#112d4b35');glow.addColorStop(1,'#00000000');c.fillStyle=glow;c.fillRect(x-r*2.2,y-r*2.2,r*4.4,r*4.4);c.restore();}
    const faces=stone.faces.map(face=>({face,z:face.reduce((sum,i)=>sum+points[i][2],0)/3})).sort((a,b)=>a.z-b.z);
    for(const {face} of faces){
      const [a,b,d]=face.map(i=>points[i]),u=b.map((v,i)=>v-a[i]),v=d.map((n,i)=>n-a[i]);
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      const len=Math.hypot(...n)||1,light=clamp((n[0]*-.3+n[1]*.8+n[2]*.7)/len,-1,1);
      const band=stone.pattern==='banded'&&Math.abs((a[1]+b[1]+d[1])/3)<.16;
      const lum=(stone.rare?66+light*17:62+light*17)+(band?12:0),sat=stone.rare?48:band?12:24;
      this.polygon(face.map(i=>[x+points[i][0]*r,y-points[i][1]*r]),`hsl(${stone.hue+(stone.rare?light*42:0)}, ${sat}%, ${lum}%)`,opacity);
      if(stone.pattern==='speckled'){
        const px=x+(a[0]+b[0]+d[0])/3*r,py=y-(a[1]+b[1]+d[1])/3*r;
        c.globalAlpha=opacity*.45;c.fillStyle=light>0?'#4d6f78':'#d9e8df';c.beginPath();c.arc(px,py,Math.max(.35,r*.013),0,Math.PI*2);c.fill();c.globalAlpha=1;
      }
    }
    if(stone.rare){c.save();c.strokeStyle='#fff2d9';c.lineWidth=1;for(let i=0;i<3;i++){const p=points[i*2%points.length],twinkle=.35+.65*Math.pow(.5+.5*Math.sin(angle*3+i*2.1),3),size=2+twinkle*3;c.globalAlpha=opacity*twinkle;c.beginPath();c.moveTo(x+p[0]*r-size,y-p[1]*r);c.lineTo(x+p[0]*r+size,y-p[1]*r);c.moveTo(x+p[0]*r,y-p[1]*r-size);c.lineTo(x+p[0]*r,y-p[1]*r+size);c.stroke();}c.restore();}
  }
  waterReflection(stone,x,y,r,height,angle,now,opacity=1){
    const c=this.ctx,proximity=Math.exp(-Math.max(0,height)*.85);
    c.save();c.beginPath();c.rect(0,this.h*.39,this.w,this.h*.61);c.clip();
    c.globalAlpha=opacity*(.10+proximity*.10);c.fillStyle='#173e52';c.beginPath();
    c.ellipse(x,y,r*(1.1+(1-proximity)*.45),Math.max(2,r*.19),0,0,Math.PI*2);c.fill();
    const shimmer=Math.sin(now*1.3+x*.01)*1.3;
    c.translate(x+shimmer,y+r*.3+Math.min(height,2)*r*.25);c.scale(1,-.36);
    this.stone(stone,0,0,r*.92,angle,false,opacity*(.055+proximity*.10));
    c.restore();
  }
  wave(wave,now,waves=[],fresh=false){
    const age=now-wave.time,life=120;
    if(age<0||age>life)return;
    const exit=wave.fadeStart==null?0:clamp((now-wave.fadeStart)/Math.max(.1,(wave.fadeEnd??wave.fadeStart+3.5)-wave.fadeStart));
    const envelopeAge=wave.retiredAt==null?age:wave.retiredAt-wave.time;
    const echoIn=wave.echo?clamp(envelopeAge/.45):1,echoOut=wave.echo?clamp((13.5-envelopeAge)/1.2):1;
    const freshOut=clamp((2.2-age)/1.4),freshGain=fresh?freshOut*freshOut*(3-2*freshOut):1;
    const c=this.ctx,fade=freshGain*echoIn*echoIn*(3-2*echoIn)*echoOut*echoOut*(3-2*echoOut)*(1-exit*exit*(3-2*exit))*Math.exp(-age*1.5/(wave.echo?5.5:wave.rare?29:24))*(wave.gain??1),shape=wave.sides||5;

    // A narrow pearlescent palette keeps each stone's rings subtly varied.
    const families=[
      ['#bce4df','#c5e8e2','#c1e1dc','#cae8e3'],
      ['#ead9ab','#efdfb8','#e7d6aa','#eee2bf'],
      ['#cebfeb','#d7cbed','#cbbfe3','#dad0ed'],
      ['#e8c0cf','#edcbd5','#e3becc','#ecd0d8'],
    ];
    const colors=wave.rare?['#ffe6ac','#edbce3','#c9c5ff','#a6e6ee']:families[(wave.color??0)%4];
    const quality=this.effectQuality??1;
    const rings=fresh?1:wave.echo?2:wave.rare?6:5;
    const inks=colors;
    const neighbors=waves.filter(other=>other!==wave&&other.stone?.seed!==wave.stone?.seed&&now-other.time>=0&&now-other.time<24);
    c.save();c.beginPath();c.rect(0,this.h*.37,this.w,this.h*.63);c.clip();
    for(let ring=0;ring<rings;ring++){
      if(!fresh&&ring>0&&quality*rings<=ring)continue;
      const a=age-ring*.48;if(a<=0)continue;
      const r=a*(1.35+wave.strength*.65);
      const warp=Math.min(.035,age*.01);
      c.beginPath();c.lineJoin='round';c.lineCap='round';c.miterLimit=1;let lastPoint=null;
      for(let j=0;j<=100;j++){
        const theta=j/100*Math.PI*2;
        let rr=r*(1+warp*Math.sin(theta*shape+wave.phase));
        const x=wave.x+Math.cos(theta)*rr,z=wave.z+Math.sin(theta)*rr;
        let influence=0;
        for(const other of neighbors){
          if(other===wave)continue;
          const elapsed=now-other.time;if(elapsed<0)continue;
          const distance=Math.hypot(x-other.x,z-other.z),front=elapsed*(1.35+other.strength*.65);
          const band=Math.exp(-(((distance-front)/2.2)**2));
          const retirement=other.fadeStart==null?0:clamp((now-other.fadeStart)/Math.max(.1,other.fadeEnd-other.fadeStart));
          const fadeIn=clamp(elapsed/.45),fadeOut=clamp((24-elapsed)/4);
          const echoAge=other.retiredAt==null?elapsed:other.retiredAt-other.time;
          const echoTail=other.echo?clamp((13.5-echoAge)/1.2):1;
          const presence=fadeIn*fadeIn*(3-2*fadeIn)*fadeOut*fadeOut*(3-2*fadeOut)*echoTail*echoTail*(3-2*echoTail)*(1-retirement*retirement*(3-2*retirement))*(other.echo?Math.min(1,other.gain??1):1);
          influence+=Math.sin(distance*3-elapsed*4+other.phase)*band*other.strength*Math.exp(-elapsed/24)*presence;
        }
        rr+=clamp(influence,-1.5,1.5)*.225;
        const depth=wave.z+Math.sin(theta)*rr;
        if(depth<.1){lastPoint=null;continue;}
        const p=this.project(wave.x+Math.cos(theta)*rr,influence*.0375,depth);
        if(!Number.isFinite(p.x)||!Number.isFinite(p.y)){lastPoint=null;continue;}
        if(lastPoint){
          const segment=clipWaterSegment(lastPoint,p,this.w,this.h);
          if(segment){c.moveTo(segment[0].x,segment[0].y);c.lineTo(segment[1].x,segment[1].y);}
        }
        lastPoint=p;
      }
      c.globalCompositeOperation='source-over';c.globalAlpha=clamp(fade*(.75-ring*.10)*(fresh||ring===0?1:clamp(quality*rings-ring)));c.strokeStyle=wave.rare?`hsl(${(now*12+(wave.index||0)*43+ring*38+(wave.stone.seed%90))%360},65%,82%)`:inks[ring%4];c.lineWidth=(ring===0?1.9:1.1)*(1+(wave.resonance||0)*.35)*clamp(1.15-wave.z*.025,.8,1);c.stroke();
      c.globalCompositeOperation='source-over';
    }
    if(!wave.echo&&age<.5){const p=this.project(wave.x,0,wave.z);c.globalAlpha=(1-age/.5)*.65;c.fillStyle='#fff5dd';for(let j=0;j<7;j++){const a=j/7*Math.PI*2;const size=Math.max(1,p.scale*.012);c.beginPath();c.arc(p.x+Math.cos(a)*age*p.scale*.4,p.y+Math.sin(a)*age*p.scale*.15-Math.sin(age/.5*Math.PI)*p.scale*.11,size,0,Math.PI*2);c.fill();}}
    c.restore();
  }
  atmosphere(now,reduced){
    const c=this.ctx,w=this.w,h=this.h,t=reduced?0:now;
    // Quiet distant layers; all motion freezes with the shared music clock.
    for(let i=0;i<4;i++){
      const shifted=t+i*23,cycle=Math.floor(shifted/100),local=shifted-cycle*100,seed=cycle*17+i*39;
      const wait=variation(seed+1)*22,duration=55+variation(seed+2)*20,progress=(local-wait)/duration;
      if(progress<0||progress>1)continue;
      const x=(progress*1.7-.35)*w,y=h*(.09+variation(seed+3)*.14),s=w*(.10+variation(seed+4)*.14);
      this.polygon([[x-s,y],[x-s*.5,y-h*.014],[x,y-h*.019],[x+s*.42,y-h*.01],[x+s,y],[x+s*.25,y+h*.008]],'#ffe3d9',.09+variation(seed+5)*.09);
    }
    c.strokeStyle='#555e7660';c.lineWidth=1.1;
    for(let i=0;i<3;i++){
      const x=((t*.012+i*.028+.68)%1.3-.15)*w,y=h*(.275+i*.009),flap=Math.sin(t*2.2+i)*2;
      c.beginPath();c.moveTo(x-5,y+flap);c.quadraticCurveTo(x-2,y-2,x,y);c.quadraticCurveTo(x+2,y-2,x+5,y+flap);c.stroke();
    }
    c.save();c.beginPath();c.rect(0,h*.39,w,h*.61);c.clip();
    for(let i=0;i<35;i++){
      const depth=(i+1)/36,y=h*(.40+depth*depth*.55);
      if(y<h*.50)continue;
      const x=((i*.618+t*(.002+depth*.004))%1)*w;
      const shoreFade=clamp((y/h-.50)/.08);
      const shimmer=.055*shoreFade;
      c.strokeStyle=`rgba(255,226,193,${shimmer})`;c.lineWidth=.6+depth;
      const span=(.018+depth*.06)*w;
      c.beginPath();c.moveTo(x-span,y);c.quadraticCurveTo(x,y+Math.sin(t*.7+i)*depth*2,x+span,y);c.stroke();
    }
    // Long, low-contrast gusts travel across the middle distance.
    for(let i=0;i<3;i++){
      const wind=passingWind(t,i),phase=wind.progress;
      if(!wind.amplitude)continue;
      const y=h*(.54+i*.065),x=(phase*1.5-.25)*w;
      c.strokeStyle=`rgba(179,227,222,${wind.amplitude*.16})`;c.lineWidth=1;
      c.beginPath();c.moveTo(x-w*.15,y);c.bezierCurveTo(x-w*.03,y-3,x+w*.09,y+3,x+w*.18,y);c.stroke();
    }
    // Small shoreline pads leave the throwing corridor unobstructed.
    for(let i=0;i<5;i++){
      const x=w*(i<3?.07+i*.032:.90+(i-3)*.045)+Math.sin(t*.45+i)*1.4,y=h*(.78+(i%3)*.037)+Math.sin(t*.55+i)*.8;
      const r=7+i%3*3;
      this.polygon([[x-r,y],[x-r*.5,y-r*.38],[x+r*.65,y-r*.3],[x+r,y],[x+r*.3,y+r*.3],[x-1,y+1],[x-r*.3,y+r*.32]],'#719d91',.75);
      if(i===1)this.polygon([[x-3,y-2],[x-4,y-7],[x,y-5],[x+3,y-8],[x+4,y-2]],'#edc3bc',.9);
    }
    c.restore();
    for(let i=0;i<7;i++){
      const x=(i%2?w*.91:w*.08)+Math.sin(t*.23+i*3)*w*.07,y=h*(.68+(i%4)*.055)+Math.sin(t*.37+i)*6;
      c.globalAlpha=.15+Math.max(0,Math.sin(t*1.1+i*2))*.40;c.fillStyle='#ffe2a2';c.beginPath();c.arc(x,y,1.2,0,Math.PI*2);c.fill();
    }
    c.globalAlpha=1;
  }
  drawReeds(now,reduced){
    // Every stalk has its own rooted curve. Wind changes x only, never y.
    const w=this.w,h=this.h,size=Math.min(h*.68,w*1.02,640);
    for(const side of [-1,1])for(let i=0;i<14;i++){
      const rand=n=>{const v=Math.sin((i+1)*127.1+side*37+n*311.7)*43758.5453;return v-Math.floor(v);};
      const baseX=(side<0?0:w)-side*(rand(1)*size*.25)-this.camera.x*(18+rand(2)*10)-side*(this.entryVeil||0)*w*(.16+rand(11)*.10);
      const length=size*(.44+rand(4)*.56);
      const lean=side*(.08+rand(5)*.25)*length;
      const phase=rand(6)*Math.PI*2;
      const passing=passingWind(now-i*.07);
      const gust=Math.sin(now*.53-i*.10)*.20+passing.amplitude*Math.sin(passing.progress*Math.PI)*1.05;
      const breeze=reduced?0:(gust*.72+Math.sin(now*(.72+rand(7)*.25)+phase)*.28)*length*(.035+rand(8)*.025);
      const point=t=>[baseX+lean*t+breeze*t*t,h+12+rand(3)*32-length*t];
      const width=1.4+rand(9)*1.5;
      const left=[],right=[];
      for(let j=0;j<=8;j++){const t=j/8,p=point(t);left.push([p[0]-width*(1-t*.65),p[1]]);right.unshift([p[0]+width*(1-t*.65),p[1]]);}
      this.polygon([...left,...right],i%3===0?'#879975':'#567d73');
      for(let leaf=0;leaf<2;leaf++){
        const t=.25+leaf*.23,p=point(t),direction=(i+leaf)%2?1:-1;
        const tip=[p[0]+direction*length*(.15+rand(10+leaf)*.12)+breeze*.25,p[1]-length*.20];
        this.polygon([p,[p[0]+direction*length*.09,p[1]-length*.15],tip,[p[0]+direction*length*.06,p[1]-length*.045]],leaf?'#87a18a':'#658d80');
      }
      if(i%3!==1){
        const top=point(1),bottom=point(.84),r=3+length*.007;
        this.polygon([[bottom[0]-r,bottom[1]],[top[0]-r*.7,top[1]],[top[0]+r*.4,top[1]-4],[top[0]+r,top[1]+2],[bottom[0]+r,bottom[1]]],i%2?'#9f7965':'#bc9274');
        this.polygon([[bottom[0],bottom[1]],[top[0],top[1]],[top[0]+r*.4,top[1]-4],[top[0]+r,top[1]+2],[bottom[0]+r,bottom[1]]],'#d1ad87',.65);
      }
    }
  }
  submergedStones(now,reduced){
    const c=this.ctx,w=this.w,h=this.h;
    c.save();
    for(let i=0;i<17;i++){
      const depth=variation(i+203),r=(12+variation(i+81)*24)*(w/390)**.35*(.65+depth*.55);
      const x=w*(.07+variation(i+27)*.86)-this.camera.x*(10+depth*12);
      const y=h*(.76+depth*.235);
      const shimmer=reduced?.5:.5+.5*Math.sin(now*.58+i*2.3);
      const visibility=(.09+depth*.08)*( .65+shimmer*.55);
      const points=Array.from({length:10},(_,j)=>{
        const a=j/10*Math.PI*2,rough=.90+variation(i*17+j)*.16;
        const refract=reduced?0:Math.sin(now*.8+a*2+i)*1.1;
        return [x+Math.cos(a)*r*rough+refract,y+Math.sin(a)*r*.49*rough];
      });
      this.polygon(points,'#244f59',visibility);
      this.polygon([points[0],points[1],points[2],points[3],points[4],[x-r*.1,y-r*.14]],i%3===0?'#b4bb9e':'#7db1ac',visibility*.95);
      this.polygon([points[4],points[5],points[6],points[7],[x-r*.1,y-r*.14]],'#385d70',visibility*.8);
      // Broken caustic glints stay inside the stone silhouette.
      c.save();c.beginPath();points.forEach((p,j)=>j?c.lineTo(...p):c.moveTo(...p));c.closePath();c.clip();
      c.globalAlpha=visibility*(.20+shimmer*.45);c.strokeStyle='#b6ddd0';c.lineWidth=.8;
      c.beginPath();for(let j=0;j<=12;j++){const xx=x-r+j*r/6,yy=y-r*.12+Math.sin(j*.6+now*.7+i)*r*.13;j?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.stroke();c.restore();
    }
    c.restore();
  }
  draw(state){
    const {now,reduced,hand,drag,flights,waves,tilt,listen}=state,c=this.ctx,w=this.w,h=this.h;
    const entry=reduced?1:(state.entryProgress??1);this.entryVeil=1-entry*entry*(3-2*entry);
    this.camera.x+=(tilt.x-this.camera.x)*.055;this.camera.y+=(tilt.y-this.camera.y)*.045;
    c.clearRect(0,0,w,h);c.fillStyle='#638eac';c.fillRect(0,0,w,h);
    if(this.lakeLoaded){
      // Height-fit preserves the true lake horizon on portrait phones. Landscape
      // stretches this painted environment slightly to keep the same eye height.
      const iw=Math.max(w+24,h*1.5),ih=h+12,ix=-(iw-w)*(w/h<.9?.61:.5)-this.camera.x*5;
      c.save();const advance=1-.035*this.entryVeil;c.translate(w/2,h*.367);c.scale(advance,advance);c.translate(-w/2,-h*.367);c.drawImage(this.lake,ix,-6+this.camera.y*3,iw,ih);c.restore();
    }
    const shade=c.createLinearGradient(0,h*.6,0,h);shade.addColorStop(0,'#062f4600');shade.addColorStop(1,'#083b4b66');c.fillStyle=shade;c.fillRect(0,h*.6,w,h*.4);
    this.submergedStones(now,reduced);
    this.atmosphere(now,reduced);
    const effectStart=this.runtime.nowMs();
    const targetQuality=(this.effectCost??0)>12?.65:1;
    this.effectQuality=(this.effectQuality??1)+(targetQuality-(this.effectQuality??1))*.005;
    const combined=[...waves,...stoneEchoes(state.voices||[],now)];
    if(this.rippleLayer){
      const layer=this.rippleLayer,rc=layer.getContext('2d');
      rc.clearRect(0,0,w,h);this.ctx=rc;
      try{for(const wave of combined)this.wave(wave,now,combined);}finally{this.ctx=c;}
      // Mask the combined result: overlapping sources cannot brighten the horizon.
      rc.save();rc.globalCompositeOperation='destination-in';rc.globalAlpha=1;
      const horizon=rc.createLinearGradient(0,0,0,h);
      // Cap the entire compressed far-water band, after all rings are combined.
      // Middle-distance visibility returns smoothly, without a hard clipping edge.
      for(const [stop,alpha] of [[0,0],[.39,0],[.41,.015],[.44,.5275],[.465,.55],[.49,.70],[.53,1],[1,1]])horizon.addColorStop(stop,'rgba(255,255,255,'+alpha+')');
      rc.fillStyle=horizon;rc.fillRect(0,0,w,h);rc.restore();
      c.drawImage(layer,0,0,w,h);
    }else for(const wave of combined)this.wave(wave,now,combined);
    // New distant contacts retain a local first ring above the atmospheric layer.
    // Only recent impacts qualify; persistent echoes stay in the softened layer.
    for(const impact of waves){
      const age=now-impact.time;
      if(impact.echo||age<0||age>=2.2)continue;
      const y=this.project(impact.x,0,impact.z).y/h;
      const far=clamp((.53-y)/.07);
      if(far>0)this.wave({...impact,gain:(impact.gain??1)*far*.9},now,combined,true);
    }
    this.effectCost=(this.effectCost??0)*.95+(this.runtime.nowMs()-effectStart)*.05;
    for(const f of flights){
      if(!f.alive)continue;
      const shadow=this.project(f.x,0,f.z);this.waterReflection(f.stone,shadow.x,shadow.y,Math.max(2,shadow.scale*f.stone.radius),f.y,(f.stone.rare?f.age*(f.curveSpin||f.stone.spin)*10:0),now);
      if(!reduced&&f.trail.length>1){
        c.save();c.lineCap='round';
        for(let i=1;i<f.trail.length;i++){
          const a=this.project(f.trail[i-1].x,f.trail[i-1].y,f.trail[i-1].z),b=this.project(f.trail[i].x,f.trail[i].y,f.trail[i].z),t=i/(f.trail.length-1);
          c.globalAlpha=t*(f.stone.rare?.65:.30);c.strokeStyle=f.stone.rare?'#e6d8ff':'#eef3ee';c.lineWidth=f.stone.rare?.7+t*1.7:1;
          c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
        }
        c.restore();
      }
      const p=this.project(f.x,f.y,f.z);this.stone(f.stone,p.x,p.y,Math.max(2,p.scale*f.stone.radius),(f.stone.rare?f.age*(f.curveSpin||f.stone.spin)*10:0));
    }
    this.drawReeds(now,reduced);
    if(!listen&&hand){
      const p=drag?{x:drag.x,y:drag.y}:state.dock;
      if(drag&&!reduced){c.beginPath();for(let i=0;i<drag.samples.length;i++){const s=drag.samples[i];i?c.lineTo(s.x,s.y):c.moveTo(s.x,s.y);}c.strokeStyle='#fff2ce40';c.lineWidth=1.5;c.stroke();}
      const opacity=state.handOpacity??1;
      if(p.y>h*.42)this.waterReflection(hand,p.x,Math.min(h*.94,p.y+state.handRadius*2.2),state.handRadius*.83,1.2,now*.12,now,opacity*1.3);
      if(hand.rare&&!drag&&!reduced){
        const age=state.handRevealAge??5;
        if(age>0&&age<2.8){
          c.save();
          for(let i=0;i<7;i++){
            const t=clamp((age-i*.085)/1.8),light=Math.sin(t*Math.PI)*opacity;
            if(light<=0)continue;
            const a=i/7*Math.PI*2-.4,dist=state.handRadius*(1.1+t*.95),x=p.x+Math.cos(a)*dist,y=p.y+Math.sin(a)*dist*.78,size=(3+i%3)*light;
            c.globalAlpha=light*.8;c.fillStyle=i%2?'#f4e4ff':'#fff2ca';
            c.beginPath();c.moveTo(x,y-size*1.6);c.lineTo(x+size*.28,y-size*.28);c.lineTo(x+size,y);c.lineTo(x+size*.28,y+size*.28);c.lineTo(x,y+size*1.6);c.lineTo(x-size*.28,y+size*.28);c.lineTo(x-size,y);c.lineTo(x-size*.28,y-size*.28);c.closePath();c.fill();
          }
          c.restore();
        }
      }
      this.stone(hand,p.x,p.y+(1-opacity)*9,state.handRadius*(.94+opacity*.06),now*(reduced?0:(drag?.spin?drag.spin*7:.12))+(drag?drag.x/w:.0),true,opacity);
    }
  }
}

module.exports={stoneEchoes,clipWaterSegment,PondRenderer};
