(() => {
  'use strict';
  const canvas = document.querySelector('#world');
  const ctx = canvas.getContext('2d', {alpha:false, desynchronized:true});
  const button = document.querySelector('#motion');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduce.matches, w=0,h=0,dpr=1,t=0,last=0,progress=0,target=0,px=-1000,py=-1000,ripple=0,raf=0;
  const stops = [
    {skyTop:[44,59,80],skyMid:[168,119,118],skyLow:[237,164,122],water:[43,65,78],sun:[255,214,154],sunY:.515,light:1},
    {skyTop:[26,42,67],skyMid:[115,85,111],skyLow:[218,122,100],water:[27,47,70],sun:[255,178,122],sunY:.565,light:.78},
    {skyTop:[9,23,43],skyMid:[26,47,75],skyLow:[75,83,104],water:[12,32,57],sun:[224,222,205],sunY:.265,light:.38},
    {skyTop:[34,59,77],skyMid:[103,118,124],skyLow:[222,171,137],water:[28,58,70],sun:[255,224,177],sunY:.50,light:.85}
  ];
  const mix=(a,b,k)=>a+(b-a)*k;
  const col=(a,b,k)=>a.map((n,i)=>Math.round(mix(n,b[i],k)));
  const rgba=(a,opacity=1)=>`rgba(${a[0]},${a[1]},${a[2]},${opacity})`;
  const hash=(n)=>{let x=Math.sin(n*127.1+78.233)*43758.5453;return x-Math.floor(x)};
  const smooth=(x)=>x*x*(3-2*x);
  function resize(){ dpr=Math.min(devicePixelRatio||1,1.75);w=innerWidth;h=innerHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw(); }
  function getScene(){const s=Math.min(2.999,Math.max(0,progress*3)),i=Math.floor(s),k=smooth(s-i);let out={};for(let key of Object.keys(stops[0]))out[key]=Array.isArray(stops[i][key])?col(stops[i][key],stops[i+1][key],k):mix(stops[i][key],stops[i+1][key],k);return out;}
  function disk(x,y,r,c,glow){let g=ctx.createRadialGradient(x,y,r*.28,x,y,r*glow);g.addColorStop(0,rgba(c,.3));g.addColorStop(.23,rgba(c,.18));g.addColorStop(.56,rgba(c,.045));g.addColorStop(1,rgba(c,0));ctx.fillStyle=g;ctx.fillRect(x-r*glow,y-r*glow,r*glow*2,r*glow*2);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=rgba(c,.94);ctx.fill();}
  function draw(){if(!w)return;const s=getScene(),hy=h*(w<700?.565:.585),sunX=w*(w<700?.72:.72),sunY=h*s.sunY;
    let sky=ctx.createLinearGradient(0,0,0,hy);sky.addColorStop(0,rgba(s.skyTop));sky.addColorStop(.54,rgba(s.skyMid));sky.addColorStop(1,rgba(s.skyLow));ctx.fillStyle=sky;ctx.fillRect(0,0,w,hy+1);
    let halo=ctx.createRadialGradient(sunX,hy*.87,0,sunX,hy*.87,w*.52);halo.addColorStop(0,rgba(s.sun,.18*s.light));halo.addColorStop(1,rgba(s.sun,0));ctx.fillStyle=halo;ctx.fillRect(0,0,w,hy);
    // Stars wait until evening. Stable seed positions make scrolling reversible.
    let night=Math.max(0,Math.min(1,(progress-.37)/.25))*(1-Math.max(0,(progress-.77)/.23));
    for(let i=0;i<95;i++){let x=hash(i*7+1)*w,y=hash(i*13+5)*hy*.87,r=.35+hash(i*11+2)*1.2;ctx.fillStyle=`rgba(255,239,224,${night*(.18+hash(i*3+9)*.62)})`;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();}
    if(sunY<hy+25){disk(sunX,sunY,Math.max(22,Math.min(w,h)*.041),s.sun,7);}
    // Distant rock silhouette, irregular pen-line edge and its dim reflection.
    ctx.beginPath();ctx.moveTo(0,hy+7);ctx.lineTo(0,hy-8);ctx.bezierCurveTo(w*.055,hy-9,w*.08,hy-21,w*.118,hy-17);ctx.bezierCurveTo(w*.145,hy-17,w*.18,hy-35,w*.217,hy-31);ctx.bezierCurveTo(w*.255,hy-30,w*.283,hy-11,w*.33,hy-12);ctx.bezierCurveTo(w*.38,hy-12,w*.42,hy-4,w*.47,hy-6);ctx.lineTo(w*.47,hy+7);ctx.closePath();ctx.fillStyle=rgba(col(s.water,[9,22,36],.68));ctx.fill();
    let sea=ctx.createLinearGradient(0,hy,0,h);sea.addColorStop(0,rgba(col(s.water,s.skyLow,.27)));sea.addColorStop(.23,rgba(s.water));sea.addColorStop(1,rgba(col(s.water,[6,22,36],.56)));ctx.fillStyle=sea;ctx.fillRect(0,hy,w,h-hy);
    // Optical light path: broken ribbons widen as they approach the viewer.
    const glowX=sunX, seaH=h-hy, span=Math.max(160,w*.38);
    for(let j=0;j<104;j++){
      let depth=j/104,y=hy+Math.pow(depth,1.38)*seaH, width=(8+depth*span)*(.14+.86*hash(j*17+9));
      let x=glowX+(hash(j*47+13)-.5)*Math.pow(depth,.7)*(span*.87)+Math.sin(j*.55+t*.65)*depth*7;
      let rh=Math.max(.8,depth*3.8), alpha=s.light*(.03+(1-depth)*.16+hash(j*41+7)*.12);
      if(j%5===0)alpha*=1.35;
      ctx.fillStyle=rgba(s.sun,alpha);ctx.beginPath();ctx.ellipse(x,y,width*.5,rh,0,0,7);ctx.fill();
    }
    // Perspective wavelets: curved, individually phased lines. Pointer wakes displace them.
    for(let row=0;row<53;row++){
      let d=(row+.7)/54,y=hy+Math.pow(d,1.28)*seaH,spacing=18+d*94;
      for(let x=-spacing;x<w+spacing;x+=spacing){
        let seed=row*977+Math.round(x/spacing)*37,noise=hash(seed),length=(13+d*70)*(0.3+noise*.9);let xx=x+(hash(seed+3)-.5)*spacing*.8;
        let wobble=Math.sin(t*(.4+d*.35)+seed*.35)*(.6+d*2.6);
        let dist=Math.hypot((xx-px)*.8,(y-py)*1.6), wake=ripple*Math.exp(-dist/125)*Math.sin(dist*.09-t*7)*8;
        let yy=y+wobble+wake;
        ctx.strokeStyle=rgba(col(s.water,[222,201,175],.4+noise*.35),(.06+noise*.13)*(1-d*.13));ctx.lineWidth=.7+d*.8;ctx.beginPath();ctx.moveTo(xx,yy);ctx.quadraticCurveTo(xx+length*.43,yy-1.6-d*2,xx+length,yy);ctx.stroke();
      }
    }
    // Foreground shore creates parallax and a firm visual finish at the bottom.
    let shore=ctx.createLinearGradient(0,h*.87,0,h);shore.addColorStop(0,'rgba(7,22,32,0)');shore.addColorStop(.62,'rgba(9,21,28,.25)');shore.addColorStop(1,'rgba(8,17,23,.68)');ctx.fillStyle=shore;ctx.fillRect(0,h*.85,w,h*.15);
  }
  function tick(now){if(!last)last=now;let dt=Math.min((now-last)/1000,.05);last=now;if(!paused)t+=dt;progress=mix(progress,target,Math.min(1,dt*3.5));ripple=Math.max(0,ripple-dt*.48);draw();raf=requestAnimationFrame(tick);}
  function scroll(){let max=document.documentElement.scrollHeight-innerHeight;target=max?Math.min(1,scrollY/max):0;if(paused){progress=target;draw();}}
  function pointer(e){if(e.clientY<h*.5)return;px=e.clientX;py=e.clientY;ripple=1;if(paused)draw();}
  button.addEventListener('click',()=>{paused=!paused;button.setAttribute('aria-pressed',String(paused));button.innerHTML=paused?'PLAY MOTION <span aria-hidden="true">▶</span>':'PAUSE MOTION <span aria-hidden="true">Ⅱ</span>';if(!paused){last=0;raf=requestAnimationFrame(tick)}else cancelAnimationFrame(raf);});
  reduce.addEventListener('change',e=>{if(e.matches&&!paused)button.click()});
  addEventListener('resize',resize,{passive:true});addEventListener('scroll',scroll,{passive:true});addEventListener('pointermove',pointer,{passive:true});addEventListener('pointerdown',pointer,{passive:true});
  resize();scroll();button.setAttribute('aria-pressed',String(paused));if(paused)button.innerHTML='PLAY MOTION <span aria-hidden="true">▶</span>';else raf=requestAnimationFrame(tick);
  window.__lowTide={get state(){return {progress,paused,canvas:[canvas.width,canvas.height]}}};
})();
