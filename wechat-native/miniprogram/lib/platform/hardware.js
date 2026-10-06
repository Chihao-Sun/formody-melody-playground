const clamp=(v,lo=-1,hi=1)=>Math.max(lo,Math.min(hi,v));
class ImpactHaptics{
  constructor(api,onChange=()=>{},now=()=>Date.now()){
    this.api=api;this.onChange=onChange;this.now=now;this.available=typeof api.vibrateShort==='function';this.enabled=this.available;this.status=this.available?'待触水验证':'设备不可用';this.last=-Infinity;this.generation=0;
  }
  setEnabled(value){this.enabled=Boolean(value)&&this.available;this.generation++;this.onChange();}
  impact(strength,index=0){
    const now=this.now();if(!this.enabled||!this.available||now-this.last<60)return false;this.last=now;
    const level=clamp(strength,0,1)*Math.pow(.8,index),type=level>.7?'heavy':level>.35?'medium':'light';
    const generation=this.generation;
    try{this.api.vibrateShort({type,success:()=>{if(generation!==this.generation)return;this.status='已开启';this.onChange();},fail:()=>{if(generation!==this.generation)return;this.available=false;this.enabled=false;this.status='当前设备未提供震动';this.onChange();}});return true;}
    catch{this.available=false;this.enabled=false;this.status='当前设备未提供震动';this.onChange();return false;}
  }
  // Short native impacts cannot be cancelled mid-pulse. Suppress future calls.
  stop(){this.generation++;}
}
class DeviceTilt{
  constructor(api,onChange=()=>{}){
    this.api=api;this.onChange=onChange;this.available=typeof api.startDeviceMotionListening==='function'&&typeof api.onDeviceMotionChange==='function';this.enabled=false;this.wanted=true;this.base=null;this.tilt={x:0,y:0};this.angle=0;this.reduced=false;this.status=this.available?'待开启':'设备不可用';this.token=0;
    this.listener=e=>this.sample(e);
  }
  sample(e){
    if(!this.enabled||!Number.isFinite(e.gamma)||!Number.isFinite(e.beta))return;
    // Mini-program resize reports the landscape layout, not a signed browser
    // screen.angle. Infer the side from the first posture sample, then pin it
    // until resize/recalibration. Flat-phone ambiguity needs device acceptance.
    if(!this.base&&this.landscape)this.angle=e.gamma<0?-Math.PI/2:Math.PI/2;
    // wx DeviceMotion angles are RADIANS; browser DeviceOrientation is degrees.
    const x=e.gamma*Math.cos(this.angle)+e.beta*Math.sin(this.angle),y=e.beta*Math.cos(this.angle)-e.gamma*Math.sin(this.angle);
    if(!this.base)this.base={x,y};clearTimeout(this.timer);
    const strength=this.reduced?.25:1;
    this.tilt.x=clamp((x-this.base.x)/(15*Math.PI/180))*strength;
    this.tilt.y=clamp((y-this.base.y)/(20*Math.PI/180))*strength;
    if(this.status!=='已开启'){this.status='已开启';this.onChange();}
  }
  start(){
    if(!this.available||!this.wanted||this.enabled)return;
    const token=++this.token;this.enabled=true;this.base=null;this.status='检测中';this.onChange();
    try{this.api.onDeviceMotionChange(this.listener);this.api.startDeviceMotionListening({interval:'game',success:()=>{
      if(token!==this.token){if(!this.enabled&&this.api.stopDeviceMotionListening)this.api.stopDeviceMotionListening({});return;}
      if(this.status==='已开启')return;
      this.timer=setTimeout(()=>{if(token!==this.token)return;this.stop();this.status='未收到设备姿态';this.onChange();},5000);
    },fail:()=>{if(token!==this.token)return;this.stop();this.status='设备或系统未允许';this.onChange();}});}catch{this.stop();this.status='设备或系统未允许';this.onChange();}
  }
  stop(){this.token++;clearTimeout(this.timer);this.enabled=false;this.base=null;this.tilt.x=0;this.tilt.y=0;
    try{if(this.api.offDeviceMotionChange)this.api.offDeviceMotionChange(this.listener);if(this.api.stopDeviceMotionListening)this.api.stopDeviceMotionListening({});}catch{}
  }
  setWanted(value){this.wanted=Boolean(value);if(this.wanted)this.start();else{this.stop();this.status='已关闭';this.onChange();}}
  calibrate(angle=0){this.landscape=angle==='landscape';this.angle=typeof angle==='number'?angle*Math.PI/180:0;this.base=null;this.tilt.x=0;this.tilt.y=0;}
  destroy(){this.wanted=false;this.stop();}
}
module.exports={ImpactHaptics,DeviceTilt};
