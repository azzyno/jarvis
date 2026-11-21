/* =====================================================================
   JARVIS · KERN
   Flüssiges Chrom mit Dünnfilm-Schimmer. Verformt sich mit der Stimme.
   Wird von der Startseite und vom Büro gemeinsam genutzt.
   ===================================================================== */
(function () {
  if (typeof THREE === 'undefined') return;
  const NOISE = `
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
    vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }`;
  const VERT = NOISE + `
  uniform float uTime,uLevel,uCalm;
  varying vec3 vN;varying vec3 vV;varying float vD;varying vec3 vW;
  float f(vec3 n){
    float a=snoise(n*1.35+vec3(0.,uTime*.22,uTime*.13));
    float b=snoise(n*3.4-vec3(uTime*.5,0.,uTime*.3))*.38;
    return (a+b)*(.055*uCalm+uLevel*.2);
  }
  vec3 D(vec3 n){return n*(1.+f(n));}
  void main(){
    vec3 n=normalize(position);
    vec3 t=normalize(cross(n,abs(n.y)<.99?vec3(0.,1.,0.):vec3(1.,0.,0.)));vec3 bt=cross(n,t);
    float e=.012;vec3 p0=D(n);vec3 p1=D(normalize(n+t*e));vec3 p2=D(normalize(n+bt*e));
    vec3 nn=normalize(cross(p1-p0,p2-p0));if(dot(nn,n)<0.)nn=-nn;
    vD=length(p0)-1.;
    vec3 pos=p0*length(position);
    vec4 wp=modelMatrix*vec4(pos,1.);vW=wp.xyz;
    vec4 mv=viewMatrix*wp;vV=normalize(cameraPosition-wp.xyz);
    vN=normalize(mat3(modelMatrix)*nn);
    gl_Position=projectionMatrix*mv;
  }`;
  const FRAG = `
  uniform float uTime,uLevel,uMood;uniform vec3 uTint;
  varying vec3 vN;varying vec3 vV;varying float vD;varying vec3 vW;
  vec3 env(vec3 r){
    float y=r.y;
    vec3 c=vec3(.012,.012,.016);
    c+=vec3(.92,.93,.96)*smoothstep(-.02,.18,y)*(1.-smoothstep(.18,.62,y))*.95;
    c+=uTint*exp(-pow((y+.04)*7.,2.))*1.25;
    c+=vec3(.75,.85,1.)*pow(max(r.x,0.),10.)*.9;
    c+=vec3(1.,.95,.9)*pow(max(-r.x*.7+r.y*.7,0.),24.)*1.6;
    c+=pow(max(y,0.),2.5)*vec3(.16,.17,.2);
    return c;
  }
  void main(){
    vec3 n=normalize(vN);vec3 v=normalize(vV);
    float fr=pow(1.-max(dot(n,v),0.),3.);
    vec3 r=reflect(-v,n);
    vec3 col=env(r)*.95;
    vec3 film=.5+.5*cos(6.2831*(fr*1.1+vD*3.+vec3(0.,.33,.67)+uTime*.04));
    col=mix(col,col*film*1.5,.18+fr*.45);
    col+=uTint*fr*(.25+uLevel*1.4);
    col+=uTint*smoothstep(.0,.12,vD)*uLevel*.8;
    col=col/(1.+col*.35);
    gl_FragColor=vec4(pow(col,vec3(1./1.05)),1.);
  }`;
  const TINT = { idle: new THREE.Color(1.0, .42, .17), listening: new THREE.Color(.45, .78, 1.0), speaking: new THREE.Color(1.0, .5, .2), busy: new THREE.Color(.9, .9, 1.0) };
  function material() {
    return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uCalm: { value: .6 }, uMood: { value: 0 }, uTint: { value: TINT.idle.clone() } } });
  }
  // Gemeinsamer Zustand aus der Live-Stimme
  let lvl = 0;
  function sample() {
    const V = window.JARVIS || {}; const st = V.state || 'off';
    let raw = 0; try { raw = V.level ? V.level() : 0; } catch (e) {}
    const goal = st === 'speaking' ? Math.min(1, .25 + raw * 2.6) : st === 'listening' ? Math.min(.6, raw * 2) : st === 'busy' ? .3 : 0;
    lvl += (goal - lvl) * .14; return { st, lvl };
  }
  function update(mat, T) {
    const { st, lvl } = sample(); const u = mat.uniforms;
    u.uTime.value = T; u.uLevel.value = lvl;
    u.uTint.value.lerp(TINT[st] || TINT.idle, .05);
    return { st, lvl };
  }
  window.JCore = { material, update, sample };
})();
