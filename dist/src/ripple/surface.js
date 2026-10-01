import { DURATION, envelope, smooth } from './core.js';

// Radial wavefronts + 5/10/15-fold angular harmonics. This is an artistic
// mathematical field, not a numerical fluid simulation or a billiards orbit.
export class RippleSurface {
  constructor(canvas) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d',{alpha:false});
    this.layer=document.createElement('canvas'); this.ink=this.layer.getContext('2d');
    this.bloom=document.createElement('canvas');this.soft=this.bloom.getContext('2d');
    this.available=Boolean(this.ctx&&this.ink); this.width=1;this.height=1;
  }
  resize(w,h) {
    this.width=w;this.height=h;
    // Fixed maximum fill rate; never allocate an uncapped phone-DPR canvas.
    this.ratio=Math.min(1.15,devicePixelRatio||1,1100/Math.max(w,h));
    this.canvas.width=Math.max(1,Math.round(w*this.ratio));this.canvas.height=Math.max(1,Math.round(h*this.ratio));
    this.layer.width=this.canvas.width;this.layer.height=this.canvas.height;
    this.bloom.width=Math.max(1,Math.round(w/4));this.bloom.height=Math.max(1,Math.round(h/4));
    this.ctx.setTransform(this.ratio,0,0,this.ratio,0,0);
    this.ink.setTransform(this.ratio,0,0,this.ratio,0,0);
  }
  glow(context,x,y,r,color,opacity) {
    const g=context.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(${color},${opacity})`);g.addColorStop(.38,`rgba(${color},${opacity*.58})`);g.addColorStop(1,`rgba(${color},0)`);
    context.fillStyle=g;context.fillRect(x-r,y-r,r*2,r*2);
  }
  path(cx,cy,r,growth,phase,j,family,tick,samples) {
    const points=[];
    for(let k=0;k<=samples;k++){
      const a=k/samples*Math.PI*2;
      const warp=1+growth*(.21*Math.sin(a*5+phase+tick*.045+j*.072+family*.9)
        +.075*Math.cos(a*10-phase-tick*.027+j*.026)
        +.035*Math.sin(a*15+phase+j*.047+family));
      const angle=a+growth*family*.13;
      points.push([cx+Math.cos(angle)*r*warp,cy+Math.sin(angle)*r*warp]);
    }
    return points;
  }
  trace(context,points,reverse=false) {
    if(reverse){for(let i=points.length-1;i>=0;i--)context.lineTo(...points[i]);}
    else{context.moveTo(...points[0]);for(let i=1;i<points.length;i++)context.lineTo(...points[i]);}
  }
  draw(now,drops,reduced) {
    if(!this.available)return false;
    const c=this.ctx,l=this.ink,w=this.width,h=this.height,unit=Math.min(w,h);
    c.clearRect(0,0,w,h);c.fillStyle='#080d19';c.fillRect(0,0,w,h);
    this.glow(c,w*.5,h*.60,unit*.65,'45,70,120',.10);
    const active=drops.filter(d=>now>=d.start&&now<d.start+DURATION);
    for(const d of active){
      const age=now-d.start,env=envelope(age),growth=smooth(2.8,14,age),mist=smooth(23,33,age);
      const cx=d.x*w,cy=d.y*h,front=age*unit*(.057+d.strength*.018);
      const tick=age*(reduced?.22:1),phase=d.phase;
      const norm=1/Math.sqrt(Math.max(1,active.length));
      const palette=['44,120,236','151,69,235','241,77,130','240,167,63','46,201,177'];
      if(growth>0){
        for(let i=0;i<5;i++){
          const p=d.orbit.points[i%d.orbit.points.length];
          const scale=unit*.12*growth;
          this.glow(c,cx+p.x*scale,cy-p.y*scale,Math.max(10,front*.66),palette[i],env*growth*(.14+mist*.08)*norm);
        }
      }
      l.clearRect(0,0,w,h);l.save();l.globalCompositeOperation='screen';
      const families=growth>.6&&active.length<3?3:growth>.2?2:1;
      const rings=Math.round(4+growth*(active.length>2?14:28));
      const samples=active.length>2?96:128;
      for(let family=0;family<families;family++){
        const entry=family===0?1:family===1?smooth(.2,.6,growth)*.68:smooth(.6,1,growth)*.48;
        const p=d.orbit.points[(family*3)%d.orbit.points.length];
        const offset=family?unit*.026*growth:0;
        const ox=cx+p.x*offset,oy=cy-p.y*offset;
        const color=l.createLinearGradient(ox-front,oy-front*.6,ox+front,oy+front*.6);
        color.addColorStop(0,'#8aaaff');color.addColorStop(.22,'#50dfc1');color.addColorStop(.44,'#efb15b');color.addColorStop(.60,'#fa759d');color.addColorStop(.79,'#a087f1');color.addColorStop(1,'#56bbef');
        l.strokeStyle=color;l.fillStyle=color;
        for(let j=0;j<rings;j++){
          const r=front*(j+1)/rings;
          const opacity=entry*(1-smooth(.82,1.08,(j+1)/rings));
          const outer=this.path(ox,oy,r,growth,phase,j,family,tick,samples);
          l.beginPath();this.trace(l,outer);l.closePath();
          l.globalAlpha=(.22+growth*.38)*opacity;l.lineWidth=.72+growth*.18;l.stroke();
          if(growth>.1){
            const inner=this.path(ox,oy,Math.max(0,r-front/rings*(.25+growth*.24)),growth,phase,j-.24,family,tick,samples);
            l.beginPath();this.trace(l,outer);this.trace(l,inner,true);l.closePath();
            l.globalAlpha=growth*.075*opacity;l.fill();
          }
        }
      }
      l.restore();
      // Blur is an enhancement; crisp Canvas paths and radial-gradient haze remain
      // functional in engines that do not implement CanvasRenderingContext2D.filter.
      c.save();c.globalCompositeOperation='screen';
      const soft=this.soft,bw=this.bloom.width,bh=this.bloom.height;
      soft.clearRect(0,0,bw,bh);
      if('filter' in soft)soft.filter=`blur(${1+mist*7}px)`;
      soft.drawImage(this.layer,0,0,bw,bh);
      if('filter' in soft)soft.filter='none';
      c.globalAlpha=env*(.50+mist*.35)*norm;c.drawImage(this.bloom,0,0,w,h);
      c.globalAlpha=env*(1-mist)*norm;c.drawImage(this.layer,0,0,w,h);
      c.restore();
    }
    // UI-adjacent regions retain contrast without shrinking the generative field.
    const shade=c.createLinearGradient(0,0,0,h);
    shade.addColorStop(0,'#080d1955');shade.addColorStop(.2,'#080d1900');shade.addColorStop(.75,'#080d1900');shade.addColorStop(1,'#080d1966');
    c.fillStyle=shade;c.fillRect(0,0,w,h);return true;
  }
}
