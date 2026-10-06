function mockAudioContext(){
  const nodes=[];
  function param(){return {value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}};}
  function node(kind){const n={kind,connections:[],connect(dest,...ports){if(!dest||!dest.kind)throw new Error('Only actual native nodes may connect');this.connections.push([dest,...ports]);},disconnect(){this.disconnected=true;},gain:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),delayTime:param(),start(){this.started=true;},stop(){this.stopped=true;}};nodes.push(n);return n;}
  const c={state:'suspended',currentTime:0,sampleRate:44100,nodes,destination:node('destination'),resume(){this.state='running';if(this.onstatechange)this.onstatechange();return Promise.resolve();},suspend(){this.state='suspended';if(this.onstatechange)this.onstatechange();return Promise.resolve();},close(){this.state='closed';return Promise.resolve();},createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length),numberOfChannels:channels};},decodeAudioData(bytes,success){const buffer={numberOfChannels:1,bytes};success(buffer);}};
  for(const [method,kind] of Object.entries({createGain:'gain',createDelay:'delay',createBiquadFilter:'filter',createDynamicsCompressor:'compressor',createWaveShaper:'waveshaper',createAnalyser:'analyser',createChannelMerger:'merger',createOscillator:'oscillator',createBufferSource:'buffer-source'}))c[method]=()=>node(kind);
  return c;
}
function clockAudio(clock){return {paused:false,muted:false,context:null,events:[],now:()=>clock.ms/1000,setPaused(v){if(this.paused&&!v)clock.ms=this.saved;else if(!this.paused&&v)this.saved=clock.ms;this.paused=v;return Promise.resolve();},setMuted(v){this.muted=v;},unlock(){return Promise.resolve();},voice(){},waterImpact(){},schedule(){},clear(){},destroy(){this.destroyed=true;}};}
function runtime(clock,api={}){return {api,nowMs:()=>clock.ms,pixelRatio:()=>1,waterDownloads:()=>Promise.resolve([])};}
module.exports={mockAudioContext,clockAudio,runtime};
