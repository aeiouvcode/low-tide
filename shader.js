const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'high-performance'});
window.__gl=gl;window.onerror=(m,s,l,c)=>{document.body.dataset.error=m+" @ "+l+":"+c};
if(!gl){document.body.classList.add('no-webgl')}else{canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.body.classList.add('no-webgl')});
const vertex=`#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;
uniform vec2 res;uniform float t;uniform float scene;uniform float tg;
out vec4 frag;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(19.7,7.3);a*=.5;}return v;}
vec3 sunDir;vec3 sunCol;float waveAmp;float choppy;float windSpd;float fogAmt;float cloudCov;float nightF;float rainF;float camH;float camPitch;
void setScene(float s){
  float storm=smoothstep(.45,1.,s)*(1.-smoothstep(1.2,2.,s));
  nightF=smoothstep(1.35,2.1,s)*(1.-smoothstep(2.5,3.,s));
  float dawn=smoothstep(2.3,3.,s);
  rainF=storm;
  vec3 dSun=normalize(vec3(.42,.16,-.9));
  vec3 dStorm=normalize(vec3(.3,.32,-.9));
  vec3 dMoon=normalize(vec3(-.25,.38,-.9));
  vec3 dDawn=normalize(vec3(-.5,.12,-.85));
  if(s<1.)sunDir=normalize(mix(dSun,dStorm,s));
  else if(s<2.)sunDir=normalize(mix(dStorm,dMoon,s-1.));
  else sunDir=normalize(mix(dMoon,dDawn,s-2.));
  vec3 cDusk=vec3(1.,.42,.15)*1.6,cStorm=vec3(.55,.62,.7)*.55,cNight=vec3(.6,.72,1.)*.8,cDawn=vec3(1.,.6,.36)*1.3;
  if(s<1.)sunCol=mix(cDusk,cStorm,s);else if(s<2.)sunCol=mix(cStorm,cNight,s-1.);else sunCol=mix(cNight,cDawn,s-2.);
  waveAmp=mix(.28,1.25,storm);waveAmp=mix(waveAmp,.42,nightF);waveAmp=mix(waveAmp,.16,dawn);
  choppy=mix(1.4,2.6,storm);choppy=mix(choppy,1.2,nightF);choppy=mix(choppy,.7,dawn);
  windSpd=mix(1.,2.2,storm);
  fogAmt=.16+.30*storm+.12*nightF;
  cloudCov=mix(.34,.86,storm);cloudCov=mix(cloudCov,.28,nightF);cloudCov=mix(cloudCov,.4,dawn);
  // cinematic camera: low and intimate at dusk/night/dawn, high survey in storm
  camH=mix(2.2,5.6,storm);camH=mix(camH,2.6,nightF);camH=mix(camH,1.9,dawn);
  camPitch=mix(-.20,-.34,storm);camPitch=mix(camPitch,-.19,nightF);camPitch=mix(camPitch,-.17,dawn);
}
vec3 skyGrad(vec3 d){
  float h=clamp(d.y,-.05,1.);
  vec3 horizonDusk=vec3(.98,.44,.18),zenithDusk=vec3(.10,.16,.28);
  vec3 horizonStorm=vec3(.32,.38,.44),zenithStorm=vec3(.10,.13,.17);
  vec3 horizonNight=vec3(.05,.09,.17),zenithNight=vec3(.012,.02,.05);
  vec3 horizonDawn=vec3(.99,.6,.44),zenithDawn=vec3(.25,.34,.46);
  float s=scene;vec3 hz,zn;
  if(s<1.){hz=mix(horizonDusk,horizonStorm,s);zn=mix(zenithDusk,zenithStorm,s);}
  else if(s<2.){hz=mix(horizonStorm,horizonNight,s-1.);zn=mix(zenithStorm,zenithNight,s-1.);}
  else{hz=mix(horizonNight,horizonDawn,s-2.);zn=mix(zenithNight,zenithDawn,s-2.);}
  float g=pow(1.-max(h,0.),3.5);
  return mix(zn,hz,g);
}
vec3 sky(vec3 d,float gls){
  vec3 col=skyGrad(d);
  float sd=dot(d,sunDir);
  float disc=smoothstep(.99978,.9999,sd);
  float glow=pow(max(sd,0.),90.)*.28+pow(max(sd,0.),mix(600.,140.,gls))*.9*mix(1.,.5,gls);
  col+=sunCol*(disc*2.2+glow)*(1.-cloudCov*.9);
  if(d.y>0.015){
    vec2 cp=d.xz/(d.y+.12);
    float cl=fbm(cp*.6+vec2(t*.02*windSpd,0.));
    float cover=smoothstep(1.-cloudCov,1.-cloudCov+.38,cl);
    vec3 cloudCol=mix(skyGrad(d)*.55,vec3(.06,.075,.1),cloudCov*.75);
    cloudCol+=sunCol*pow(max(sd,0.),8.)*.22*(1.-cloudCov*.6);
    float fade=smoothstep(0.015,.14,d.y);
    col=mix(col,cloudCol,cover*.88*fade);
  }
  if(nightF>0.01&&d.y>0.04){
    vec3 sd3=normalize(d);
    vec2 sp=vec2(atan(sd3.x,sd3.z),sd3.y)*160.;
    vec2 cell=floor(sp);vec2 f=fract(sp);
    float h=hash(cell);
    if(h>.975){
      vec2 spos=vec2(hash(cell+3.1),hash(cell+9.7))*.8+.1;
      float dstar=length(f-spos);
      float tw=.55+.45*sin(t*1.5+h*80.);
      col+=vec3(.75,.83,1.)*smoothstep(.09,.01,dstar)*tw*nightF*smoothstep(.04,.2,d.y)*.62;
    }
  }
  if(rainF>0.01){
    float fl=pow(max(0.,sin(t*.53+sin(t*1.7)*.9)),60.);
    col+=vec3(.75,.82,1.)*fl*rainF*.9;
  }
  return col;
}
const int NW=7;
vec2 gDir[NW];float gAmp[NW];float gLen[NW];float gSpd[NW];
void initWaves(){
  gDir[0]=normalize(vec2(.08,-1.));gAmp[0]=1.15;gLen[0]=47.;gSpd[0]=.9;
  gDir[1]=normalize(vec2(.42,-.85));gAmp[1]=.6;gLen[1]=23.;gSpd[1]=1.1;
  gDir[2]=normalize(vec2(-.38,-.9));gAmp[2]=.45;gLen[2]=13.;gSpd[2]=1.28;
  gDir[3]=normalize(vec2(.85,-.5));gAmp[3]=.3;gLen[3]=7.5;gSpd[3]=1.5;
  gDir[4]=normalize(vec2(-.75,-.62));gAmp[4]=.22;gLen[4]=4.9;gSpd[4]=1.72;
  gDir[5]=normalize(vec2(.55,-.8));gAmp[5]=.15;gLen[5]=3.2;gSpd[5]=1.95;
  gDir[6]=normalize(vec2(-.2,-.97));gAmp[6]=.11;gLen[6]=2.2;gSpd[6]=2.25;
}
float waveH(vec2 p){
  float h=0.;float d=length(p);
  for(int i=0;i<NW;i++){
    float k=6.28318/gLen[i];
    float f=k*dot(gDir[i],p)-(.131*sqrt(gLen[i]))*k*t*windSpd*3.;
    float lod=smoothstep(gLen[i]*1.2,gLen[i]*4.5,d+gLen[i]);
    h+=gAmp[i]*waveAmp*mix(1.,.12,lod)*sin(f);
  }
  return h;
}
vec3 waveN(vec2 p,float eps){
  float h=waveH(p);
  float hx=waveH(p+vec2(eps,0.));
  float hz=waveH(p+vec2(0.,eps));
  vec3 n=normalize(vec3(h-hx,eps,h-hz));
  float d=length(p);
  float det=smoothstep(120.,25.,d);
  if(det>0.01){
    vec2 dp=p*2.6;
    float e=.5;
    mat2 r1=mat2(.8,-.6,.6,.8);
    vec2 dq=r1*dp+vec2(0.,-t*1.1);
    float n0=fbm(dq);
    float nx=fbm(dq+vec2(e,0.));
    float nz=fbm(dq+vec2(0.,e));
    vec2 dq2=r1*dp*2.3+vec2(t*.7,t*.4);
    float m0=fbm(dq2),mx=fbm(dq2+vec2(e,0.)),mz=fbm(dq2+vec2(0.,e));
    float nearBoost=smoothstep(30.,8.,d);
    n=normalize(n+vec3((n0-nx)+(m0-mx)*.6,0.,(n0-nz)+(m0-mz)*.6)*det*(.19+choppy*.06)*(1.+nearBoost*.9));
  }
  return n;
}
float crestF(vec2 p){
  float e=.6;
  float hx1=waveH(p+vec2(e,0.)),hx0=waveH(p-vec2(e,0.));
  float hz1=waveH(p+vec2(0.,e)),hz0=waveH(p-vec2(0.,e));
  float jxx=(hx1-hx0)/(2.*e),jzz=(hz1-hz0)/(2.*e);
  return clamp(-(jxx+jzz)*.9,0.,1.5);
}
float march(vec3 ro,vec3 rd,out vec3 hit){
  float hi=600.;
  if(rd.y>-0.01&&ro.y>waveAmp*1.6){hit=ro+rd*hi;return -1.;}
  float tmin=(ro.y-waveAmp*1.6)/min(rd.y,-0.001);
  float tm=max(tmin,0.);
  float step_=6.;
  tm+=step_*fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)*.7;
  float prevT=tm,prevDh=ro.y+rd.y*tm-waveH(ro.xz+rd.xz*tm);
  if(prevDh<0.){hit=ro+rd*tm;return tm;}
  for(int i=0;i<64;i++){
    float tt=prevT+step_;if(i==0)tt=prevT;
    if(tt>hi)break;
    vec3 p=ro+rd*tt;
    float dh=p.y-waveH(p.xz);
    if(dh<0.){
      float a=prevT,b=tt;
      for(int j=0;j<8;j++){
        float m=(a+b)*.5;
        vec3 mp=ro+rd*m;
        if(mp.y-waveH(mp.xz)<0.)b=m;else a=m;
      }
      hit=ro+rd*a;return a;
    }
    prevT=tt;prevDh=dh;
    step_=min(step_*1.07,26.);
  }
  hit=ro+rd*hi;return -1.;
}
void main(){
  initWaves();setScene(scene);
  vec2 uv=(gl_FragCoord.xy*2.-res)/res.y;
  float bob=waveH(vec2(0.,0.))*.3;
  vec3 ro=vec3(0.,camH+waveAmp*1.2+bob,0.);
  float yaw=sin(t*.09)*.02;
  mat2 rot=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw));
  vec3 rd=normalize(vec3(uv.x,uv.y+camPitch,-1.6));
  rd.xz=rot*rd.xz;
  vec3 col;vec3 hit;
  float dist=march(ro,rd,hit);
  if(dist<0.){
    col=sky(rd,0.);
  }else{
    vec3 n=waveN(hit.xz,.35);
    vec3 r=reflect(rd,n);
    r.y=abs(r.y);
    float fres=.02+.98*pow(1.-max(dot(-rd,n),0.),5.);
    float rough=smoothstep(40.,240.,length(hit.xz));
    vec3 refl=sky(r,rough)*mix(1.,.72,smoothstep(24.,7.,dist));
    refl*=mix(1.,.5+.5*fbm(hit.xz*vec2(.9,2.8)+vec2(0.,t*.5)),smoothstep(45.,9.,dist));
    float crest=crestF(hit.xz);
    vec3 deep=mix(vec3(.012,.09,.11),vec3(.004,.03,.05),nightF);
    vec3 shallow=mix(vec3(.03,.22,.24),vec3(.008,.06,.1),nightF);
    float sss=pow(max(dot(rd,sunDir),0.),6.)*clamp(crest-.3,0.,1.)*smoothstep(6.,22.,dist);
    vec3 body=mix(deep,shallow,clamp(crest*.8,0.,1.));
    body+=mix(sunCol,vec3(.05,.35,.3),.55)*sss*.3*(1.-nightF*.6);
    vec3 hv=normalize(sunDir-rd);
    float spec=pow(max(dot(n,hv),0.),mix(900.,60.,rough))*mix(3.,.35,rough)+pow(max(dot(n,hv),0.),90.)*.22;
    col=mix(body,refl,fres);
    col+=sunCol*spec*(1.-cloudCov*.5);
    float foamMask=fbm(hit.xz*.3+vec2(t*.1,0.))*.75+fbm(hit.xz*.09+vec2(0.,t*.05))*.6;
    float foam=smoothstep(.55,1.35,crest+foamMask*.4);
    foam*=smoothstep(.34,.66,foamMask+crest*.22);
    foam*=mix(.5,1.,smoothstep(150.,35.,length(hit.xz)));
    vec2 tp=hit.xz-vec2(.08,-1.)*2.2;
    float trail=crestF(tp)*smoothstep(.45,.85,fbm(tp*vec2(1.1,.3)+vec2(0.,t*.3)))*smoothstep(4.,14.,dist);
    foam+=clamp(trail,0.,1.)*.5;
    foam=clamp(foam,0.,1.)*(.5+choppy*.2);
    vec3 foamBase=mix(vec3(.86,.9,.92),vec3(.42,.5,.58),nightF);
    vec3 foamCol=foamBase*(skyGrad(normalize(vec3(0.,1.,.2)))*1.6+.28)+sunCol*.06;
    foamCol=max(foamCol,col*1.25);
    col=mix(col,foamCol,foam*.8);
    float fog=1.-exp(-dist*.004*(1.+fogAmt*6.));
    vec3 fogCol=skyGrad(normalize(vec3(rd.x,.02,rd.z)));
    col=mix(col,fogCol,clamp(fog,0.,1.));
  }
  col=col/(1.+col*.22);
  col=pow(max(col,0.),vec3(.9));
  vec2 q=gl_FragCoord.xy/res;
  float vig=1.-.22*pow(length(q-.5)*1.25,2.4);
  col*=vig;
  float gr=(hash(gl_FragCoord.xy+floor(tg*11.))-.5)*.014;
  frag=vec4(col+gr,1.);
}`;
function compile(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){document.body.classList.add('no-webgl');throw Error(gl.getShaderInfoLog(s))}return s}
let program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
if(!gl.getProgramParameter(program,gl.LINK_STATUS)){document.body.classList.add('no-webgl');throw Error(gl.getProgramInfoLog(program))}
gl.useProgram(program);
let uRes=gl.getUniformLocation(program,'res'),uT=gl.getUniformLocation(program,'t'),uScene=gl.getUniformLocation(program,'scene'),uTg=gl.getUniformLocation(program,'tg');
let frame=0,elapsed=0,last=0;
let qScale=1;
function applyScale(){let base=Math.min(devicePixelRatio||1,1.5)*(innerWidth>700?.5:.62);let scale=Math.min(.85,Math.max(.35,base*qScale));canvas.width=Math.max(1,Math.floor(innerWidth*scale));canvas.height=Math.max(1,Math.floor(innerHeight*scale));gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(uRes,canvas.width,canvas.height);window.__renderScale=scale}
function resize(){applyScale()}
addEventListener('resize',resize);resize();
let adaptT0=0,adaptF0=0;
function animate(now){if(!last)last=now;let dt=Math.min(.05,(now-last)/1000);last=now;if(!window.__pauseMotion)elapsed+=dt;gl.uniform1f(uT,elapsed+10.);gl.uniform1f(uTg,now/1000.);gl.uniform1f(uScene,window.__scene||0);gl.drawArrays(gl.TRIANGLES,0,3);frame++;
if(!adaptT0){adaptT0=now;adaptF0=frame}
let win=(now-adaptT0)/1000;
if(win>2.5&&frame-adaptF0>20){let fps=(frame-adaptF0)/win;window.__fps=fps;
  if(fps<24&&qScale>.42){qScale*=.8;applyScale()}else if(fps>45&&qScale<1.7){qScale*=1.12;applyScale()}
  adaptT0=now;adaptF0=frame}
requestAnimationFrame(animate)}
requestAnimationFrame(animate);window.__scene=0;window.__probe={gl:gl.getParameter(gl.VERSION),renderer:gl.getParameter(gl.RENDERER),get frames(){return frame},get elapsed(){return elapsed},get fps(){return window.__fps},get scale(){return window.__renderScale}};
}
