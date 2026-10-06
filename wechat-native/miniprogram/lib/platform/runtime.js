function defaultRuntime(api=wx,onAssetError=()=>{}){
  const perf=typeof api.getPerformance==='function'?api.getPerformance():null;
  let last=0;
  return {
    api,
    nowMs(){const n=perf?perf.now():Date.now();last=Math.max(last,n);return last;},
    pixelRatio(){return (api.getWindowInfo?api.getWindowInfo():api.getSystemInfoSync()).pixelRatio;},
    offscreen(){try{return api.createOffscreenCanvas({type:'2d',width:1,height:1});}catch{throw new Error('当前微信无法建立涟漪画布，请更新微信后重试。');}},
    assetError:onAssetError,
    createAudioContext(){
      if(typeof api.createWebAudioContext!=='function')throw new Error('当前微信不支持合成声音，请更新微信或静音进入。');
      return api.createWebAudioContext();
    },
    decodeAudio(context,bytes){return new Promise((resolve,reject)=>{
      try{const result=context.decodeAudioData(bytes,resolve,reject);if(result&&typeof result.then==='function')result.then(resolve,reject);}catch(error){reject(error);}
    });},
    waterDownloads(){return Promise.all(['skip-1','skip-2','skip-3','small','large'].map(key=>new Promise(resolve=>{
      try{api.getFileSystemManager().readFile({filePath:'assets/water/'+key+'.wav',success:r=>resolve([key,r.data]),fail:()=>resolve(null)});}catch{resolve(null);}
    })));},
  };
}

// Mono instrument voices retain equal-power left/right positioning. Do not pass
// a JS wrapper into native AudioNode.connect: .input is the actual native node.
function createStereoPanner(c){
  if(typeof c.createStereoPanner==='function'){
    const node=c.createStereoPanner();return {input:node,pan:node.pan,connect:d=>node.connect(d),disconnect:()=>node.disconnect()};
  }
  const input=c.createGain(),left=c.createGain(),right=c.createGain(),output=c.createChannelMerger(2);
  input.channelCount=1;input.channelCountMode='explicit';
  input.connect(left);input.connect(right);left.connect(output,0,0);right.connect(output,0,1);
  let value=0;
  const pan={get value(){return value;},set value(n){value=Math.max(-1,Math.min(1,n));const angle=(value+1)*Math.PI/4;left.gain.value=Math.cos(angle);right.gain.value=Math.sin(angle);}};
  pan.value=0;
  return {input,pan,connect:d=>output.connect(d),disconnect(){for(const node of [input,left,right,output])node.disconnect();}};
}

// WeChat's documented node set has no ConvolverNode. Prefer one if the runtime
// actually supplies it; otherwise use a bounded filtered-delay room tail.
// This is an audible approximation, NOT an identical convolution response.
function createReverb(c){
  if(typeof c.createConvolver==='function'){
    const node=c.createConvolver();return {input:node,convolution:true,set buffer(v){node.buffer=v;},connect:d=>node.connect(d),disconnect:()=>node.disconnect()};
  }
  const input=c.createGain(),output=c.createGain(),nodes=[input,output];
  for(const seconds of [.0297,.0371,.0411,.0437]){
    const delay=c.createDelay(1),filter=c.createBiquadFilter(),feedback=c.createGain(),wet=c.createGain();
    delay.delayTime.value=seconds;filter.type='lowpass';filter.frequency.value=3200;filter.Q.value=.2;
    feedback.gain.value=Math.pow(.001,seconds/2.8);wet.gain.value=.10;
    input.connect(delay);delay.connect(filter);filter.connect(feedback);feedback.connect(delay);filter.connect(wet);wet.connect(output);
    nodes.push(delay,filter,feedback,wet);
  }
  return {input,convolution:false,connect:d=>output.connect(d),disconnect(){for(const node of nodes)node.disconnect();}};
}
module.exports={defaultRuntime,createStereoPanner,createReverb};
