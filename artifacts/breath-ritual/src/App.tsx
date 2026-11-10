import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioLines, Camera, Check, Mic, Settings2, ShieldCheck, Volume2, VolumeX, Wind, X } from 'lucide-react';
import './index.css';

type Phase = 'rest' | 'inhale' | 'hold' | 'exhale';
type VaporStyle = 'moon' | 'sage' | 'rose';
type Particle = { x:number;y:number;vx:number;vy:number;life:number;max:number;size:number;seed:number;style:number };
const copy = {rest:{label:'A quiet moment',instruction:'Whenever you’re ready, begin.'},inhale:{label:'Breathe in',instruction:'Let the breath arrive.'},hold:{label:'Pause gently',instruction:'There is nothing to rush.'},exhale:{label:'Let it go',instruction:'Release, and watch it soften.'}};
const MIC_METER_SCALE=2500;
const MIC_MIN_TRIGGER_PERCENT=5;

function App() {
 const videoRef=useRef<HTMLVideoElement>(null),canvasRef=useRef<HTMLCanvasElement>(null),streamRef=useRef<MediaStream|null>(null),micRef=useRef<MediaStream|null>(null),audioRef=useRef<AudioContext|null>(null),rafRef=useRef<number>(0),particles=useRef<Particle[]>([]),phaseTimer=useRef<number|undefined>(undefined),audioFrame=useRef<number>(0),lastBurst=useRef(0),lastTime=useRef(0),audioUiTime=useRef(0),phaseRef=useRef<Phase>('rest');
 const [cameraState,setCameraState]=useState<'idle'|'starting'|'active'|'error'|'unavailable'>('idle'),[cameraError,setCameraError]=useState(''),[phase,setPhase]=useState<Phase>('rest'),[settingsOpen,setSettingsOpen]=useState(false),[micState,setMicState]=useState<'off'|'requesting'|'listening'|'error'>('off'),[micError,setMicError]=useState(''),[soundOn,setSoundOn]=useState(false),[vibrateOn,setVibrateOn]=useState(false),[count,setCount]=useState(()=>{try{return Number(localStorage.getItem('breath-ritual-sessions')||'0')}catch{return 0}}),[density,setDensity]=useState(62),[thickness,setThickness]=useState(58),[vaporStyle,setVaporStyle]=useState<VaporStyle>('moon'),[audioLevel,setAudioLevel]=useState(0);
 const reducedMotion=useRef(false);
 const settingsRef=useRef({density,thickness,vaporStyle});settingsRef.current={density,thickness,vaporStyle};

 const stopCamera=useCallback(()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;if(videoRef.current)videoRef.current.srcObject=null;setCameraState('idle')},[]);
 const stopMic=useCallback(()=>{cancelAnimationFrame(audioFrame.current);micRef.current?.getTracks().forEach(t=>t.stop());micRef.current=null;if(audioRef.current){void audioRef.current.close().catch(()=>{});audioRef.current=null}setAudioLevel(0);setMicState('off')},[]);
 const cleanup=useCallback(()=>{stopCamera();stopMic();cancelAnimationFrame(rafRef.current);if(phaseTimer.current)window.clearTimeout(phaseTimer.current)},[stopCamera,stopMic]);
 useEffect(()=>{reducedMotion.current=window.matchMedia('(prefers-reduced-motion: reduce)').matches;return cleanup},[cleanup]);

  const startCamera=async()=>{if(!navigator.mediaDevices?.getUserMedia){setCameraState('unavailable');setCameraError('Camera access is not available in this browser. You can still use the ritual with the visual fallback.');return}setCameraState('starting');setCameraError('');try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});streamRef.current=stream;const video=videoRef.current;if(!video)throw new Error('The camera preview is not ready.');video.srcObject=stream;await video.play();setCameraState('active')}catch(error){streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;if(videoRef.current)videoRef.current.srcObject=null;const err=error as DOMException;setCameraState('error');setCameraError(err.name==='NotAllowedError'?'Camera access was blocked. Allow it in your browser settings. If this app is in an embedded preview, open it in Safari or Chrome and try again.':err.name==='NotFoundError'?'No camera was found. The visual fallback is ready.':err.name==='NotReadableError'?'The camera is busy or unavailable. Close other apps using it, then try again.':err.name==='SecurityError'?'Camera access requires a secure page and browser permission. Open the app in Safari or Chrome and allow camera access.':'The camera could not start. Check browser permission and whether another app is using the camera, then try again.')}};

 const emitWhoosh=useCallback(()=>{if(!soundOn)return;try{const Ctx=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Ctx)return;const ctx=new Ctx();const buffer=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.85),ctx.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(850,ctx.currentTime);filter.frequency.exponentialRampToValueAtTime(210,ctx.currentTime+.8);gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.12);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.85);source.connect(filter).connect(gain).connect(ctx.destination);source.start();source.onended=()=>void ctx.close()}catch{}}
 ,[soundOn]);

 const startCloud=useCallback(()=>{const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;const dpr=Math.min(window.devicePixelRatio||1,2);const rect=canvas.getBoundingClientRect();canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);const now=performance.now();lastTime.current=now;const conf=settingsRef.current;const count=Math.round(22+conf.density*1.15);const originX=rect.width*.5,originY=rect.height*.68;const palette=conf.vaporStyle==='rose'?['#e5c6c4','#cfa7a7','#ecd8d3']:conf.vaporStyle==='sage'?['#c4d9ca','#a6c9bb','#d5e3d7']:['#dce4e1','#bac9c8','#e9e9e2'];for(let i=0;i<count;i++){const angle=(-Math.PI/2)+(Math.random()-.5)*1.35;const speed=(.28+Math.random()*.9)*(conf.thickness/58);particles.current.push({x:originX+(Math.random()-.5)*32,y:originY+Math.random()*14,vx:Math.cos(angle)*speed*.72+(Math.random()-.5)*.25,vy:Math.sin(angle)*speed-.2,life:0,max:110+Math.random()*150,size:(5+Math.random()*12)*(conf.thickness/58),seed:Math.random()*8,style:Math.floor(Math.random()*3)})}emitWhoosh();if(vibrateOn&&'vibrate'in navigator)navigator.vibrate(22);setCount(c=>{const next=c+1;try{localStorage.setItem('breath-ritual-sessions',String(next))}catch{}return next})
 if(reducedMotion.current){ctx.clearRect(0,0,rect.width,rect.height);for(const p of particles.current){const [color]=palette;ctx.globalAlpha=.2;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(p.x,p.y-20,32,17,0,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;window.setTimeout(()=>{ctx.clearRect(0,0,rect.width,rect.height);particles.current=[]},1400);return}
 cancelAnimationFrame(rafRef.current);const draw=(time:number)=>{const delta=Math.min(2,(time-lastTime.current)/16.67);lastTime.current=time;ctx.clearRect(0,0,rect.width,rect.height);particles.current=particles.current.filter(p=>p.life<p.max);for(const p of particles.current){p.life+=delta;p.x+=p.vx*delta+Math.sin(p.life*.045+p.seed)*.3*delta;p.y+=p.vy*delta;p.vx*=.997;const progress=p.life/p.max;const alpha=Math.sin(Math.PI*progress)*(.07+conf.thickness/58*.15);const radius=p.size*(.45+progress*2.8);const color=palette[p.style];const gradient=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);gradient.addColorStop(0,`${color}55`);gradient.addColorStop(.42,`${color}27`);gradient.addColorStop(1,`${color}00`);ctx.globalAlpha=alpha*5;ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;if(particles.current.length)rafRef.current=requestAnimationFrame(draw)};rafRef.current=requestAnimationFrame(draw)},[emitWhoosh,vibrateOn]);

 const beginRitual=()=>{if(phaseRef.current!=='rest')return;phaseRef.current='inhale';setPhase('inhale');phaseTimer.current=window.setTimeout(()=>{phaseRef.current='hold';setPhase('hold');phaseTimer.current=window.setTimeout(()=>{phaseRef.current='exhale';setPhase('exhale')},1100)},1400)};
 const release=()=>{if(phaseRef.current==='rest'){phaseRef.current='exhale';setPhase('exhale')}else{if(phaseTimer.current)window.clearTimeout(phaseTimer.current);phaseRef.current='exhale';setPhase('exhale')}startCloud();window.setTimeout(()=>{phaseRef.current='rest';setPhase('rest')},3000)};
 const pressAction=()=>{if(phaseRef.current==='rest')beginRitual();else release()};
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.code==='Space'&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();pressAction()}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)});

  const enableMic=async()=>{
   if(micState==='listening'){stopMic();return}
   if(!navigator.mediaDevices?.getUserMedia){setMicState('error');setMicError('Microphone access is not available in this browser.');return}
   setMicState('requesting');setMicError('');
   try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:true},video:false});
    micRef.current=stream;
    const Ctx=window.AudioContext||(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(!Ctx)throw new Error('Audio analysis is not supported in this browser.');
    const audio=new Ctx();audioRef.current=audio;
    const source=audio.createMediaStreamSource(stream),analyser=audio.createAnalyser();
    analyser.fftSize=1024;source.connect(analyser);setMicState('listening');
    const samples=new Float32Array(analyser.fftSize);
    let baseline=.001;
    const calibrationEnds=performance.now()+500;
    const sample=()=>{
     analyser.getFloatTimeDomainData(samples);
     let sum=0;for(const value of samples)sum+=value*value;
     const rms=Math.sqrt(sum/samples.length);
     const calibrating=performance.now()<calibrationEnds;
     const threshold=Math.max(MIC_MIN_TRIGGER_PERCENT/MIC_METER_SCALE,baseline*1.35);
     const burst=!calibrating&&rms>threshold;
     if(calibrating||!burst)baseline=baseline*.96+rms*.04;
     if(performance.now()-audioUiTime.current>120){setAudioLevel(Math.min(100,Math.round(rms*MIC_METER_SCALE)));audioUiTime.current=performance.now()}
     if(burst&&performance.now()-lastBurst.current>1900){lastBurst.current=performance.now();if(phaseRef.current==='rest')beginRitual();else release()}
     audioFrame.current=requestAnimationFrame(sample)
    };
    audioFrame.current=requestAnimationFrame(sample)
   }catch(error){
    stopMic();setMicState('error');
    setMicError(error instanceof DOMException&&error.name==='NotAllowedError'?'Microphone permission was declined. Allow it in browser settings to use sound-level mode.':'Microphone input could not be started. Try again or use manual mode.')
   }
  };

 const fallback=cameraState!=='active';const phaseClass=`phase-${phase}`;
 return <main className={`app-shell ${cameraState==='active'?'camera-active':''}`}>
   <video ref={videoRef} className="camera-video" style={cameraState==='active'?undefined:{display:'none'}} autoPlay muted playsInline aria-label="Mirrored front-facing camera preview"/>
   {cameraState==='active'&&<div className="video-wash"/>}
  <canvas className="vapor-canvas" ref={canvasRef} aria-hidden="true"/>
  <div className="content">
   <header className="topbar"><div className="brand"><span className="brand-mark"><Wind size={16}/></span><span>Breath Ritual</span></div><div className="top-meta"><span className="session-count" data-testid="text-session-count"><span className="count-dot"/>{count} {count===1?'pause':'pauses'} today</span><span className="status-pill" data-testid="status-camera"><i className={`status-indicator ${cameraState==='active'?'good':''} ${cameraState==='error'||cameraState==='unavailable'?'error':''}`}/>{cameraState==='active'?'Camera on':cameraState==='starting'?'Connecting': 'Visual mode'}</span></div></header>
   <section className={`main-stage ${phaseClass}`}>
    <div className="side-note">In this moment<br/>you are already here.</div>
    <div className="center-stage">
     <div className="eyebrow">A small space to pause</div>
     <h1 className="headline">Make room<br/><em>to breathe.</em></h1>
     <p className="subhead">A gentle ritual for the moments you need to reset. No rush, no judgment. Just a breath, then another.</p>
     <div className="breath-visual"><div className="breath-halo"/><Wind className="breath-icon" size={25} strokeWidth={1.2}/></div>
     <div className="phase-label" data-testid="status-breath-phase">{copy[phase].label}</div><p className="instruction" data-testid="text-breath-instruction">{copy[phase].instruction}</p>
     <button className="action-button" data-testid="button-breath-action" onClick={pressAction}><Wind size={17}/>{phase==='rest'?'Begin your pause':phase==='exhale'?'Let the moment settle':'Release your breath'}</button>
      <div className="secondary-controls"><button className={`quiet-button ${micState==='listening'?'active':''}`} data-testid="button-microphone-mode" onClick={enableMic}>{micState==='listening'?<AudioLines size={14}/>:<Mic size={14}/>} {micState==='listening'?'Mic listening':micState==='requesting'?'Asking permission':'Use sound cue'}</button><button className="quiet-button" data-testid="button-camera-toggle" disabled={cameraState==='starting'} onClick={cameraState==='active'?stopCamera:startCamera}>{cameraState==='active'?<Check size={14}/>:<Camera size={14}/>} {cameraState==='active'?'Camera on':cameraState==='starting'?'Starting…':'Turn on camera'}</button></div>
     {micState==='listening'&&<div className="mobile-side" data-testid="status-audio-level">Sound level · {audioLevel}%</div>}
     {cameraState!=='active'&&<div className="permission-card" data-testid="status-camera-help"><strong>{cameraState==='error'||cameraState==='unavailable'?'Your visual fallback is ready':'Camera is optional'}</strong>{cameraError||'Turn on your front-facing camera for a mirrored, full-screen view. The camera stays in this browser and is never recorded or uploaded.'}</div>}
     {micError&&<div className="notice" role="alert" data-testid="status-microphone-error">{micError}</div>}
     {micState==='listening'&&<div className="mobile-side" data-testid="text-microphone-explainer">Sound-level heuristic only — not breath detection.</div>}
    </div>
    <div className="side-note right">A pause is not<br/>a step backward.</div>
   </section>
   <footer className="bottom-row"><div className="privacy"><ShieldCheck size={15}/><span>Camera and audio stay on this device. Nothing is recorded or uploaded.</span></div><div className="bottom-center">SPACE TO BEGIN · YOUR PACE, YOURS</div><div className="bottom-actions"><button className="icon-button" data-testid="button-sound-toggle" onClick={()=>setSoundOn(v=>!v)} aria-label={soundOn?'Turn sound cue off':'Turn sound cue on'}>{soundOn?<Volume2 size={15}/>:<VolumeX size={15}/>} Sound {soundOn?'on':'off'}</button><button className="icon-button" data-testid="button-settings" onClick={()=>setSettingsOpen(v=>!v)} aria-expanded={settingsOpen}><Settings2 size={15}/> Tune</button></div></footer>
  </div>
  {settingsOpen&&<section className="settings-panel" aria-label="Ritual settings" data-testid="panel-settings"><div className="settings-heading"><h2>Make it yours</h2><button className="close-button" data-testid="button-close-settings" onClick={()=>setSettingsOpen(false)} aria-label="Close settings"><X size={15}/></button></div>
    <div className="setting-row"><label className="setting-label" htmlFor="density-slider">Cloud fullness<output data-testid="value-density">{density}%</output></label><input id="density-slider" data-testid="input-density" type="range" min="20" max="100" value={density} onChange={e=>setDensity(Number(e.target.value))}/></div>
    <div className="setting-row"><label className="setting-label" htmlFor="thickness-slider">Vapor softness<output data-testid="value-thickness">{thickness}%</output></label><input id="thickness-slider" data-testid="input-thickness" type="range" min="20" max="100" value={thickness} onChange={e=>setThickness(Number(e.target.value))}/></div>
    <div className="setting-row"><div className="setting-label">Tint</div><div className="style-options">{(['moon','sage','rose'] as VaporStyle[]).map(style=><button key={style} className={`style-swatch ${vaporStyle===style?'selected':''}`} data-testid={`button-vapor-${style}`} aria-pressed={vaporStyle===style} onClick={()=>setVaporStyle(style)}>{style==='moon'?'Moon':style==='sage'?'Sage':'Dawn'}</button>)}</div></div>
    <div className="setting-row"><div className="setting-label">Gentle vibration</div><button className={`quiet-button ${vibrateOn?'active':''}`} data-testid="button-vibration-toggle" onClick={()=>setVibrateOn(v=>!v)}>{vibrateOn?'On':'Off'}</button></div>
    <div className="settings-foot">Sound cues are softly synthesized on your device. Microphone mode reacts to sound level bursts only; it does not detect your breath.</div>
   </section>}
 </main>
}
export default App;
