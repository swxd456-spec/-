/* WebGL animated backgrounds. One fullscreen fragment shader per scene,
   tinted per machine with three colours (sc). Rendered at reduced resolution. */
(function (root) {
  const U = root.U;
  const HEAD = `precision mediump float;
uniform vec2 R; uniform float T; uniform vec3 C1; uniform vec3 C2; uniform vec3 C3;
float h1(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vn(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}
vec3 vig(vec3 c,vec2 uv){float d=length(uv-.5);c*=1.-smoothstep(.35,.95,d)*.75;c+=(h1(gl_FragCoord.xy+fract(T*7.3)*91.)-.5)*.03;return pow(max(c,0.),vec3(.95));}
float stars(vec2 uv,float sc,float t){vec2 g=uv*sc;vec2 id=floor(g);vec2 f=fract(g)-.5;float r=h1(id);
 if(r<.92)return 0.;vec2 o=vec2(h1(id+3.1),h1(id+7.7))-.5;float d=length(f-o*.7);
 float tw=.5+.5*sin(t*(1.+r*3.)+r*40.);return smoothstep(.06,0.,d)*tw;}
`;
  const SH = {
    nebula: `void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=uv*vec2(R.x/R.y,1.);
 float t=T*.03;vec2 q=vec2(fbm(p*1.6+t),fbm(p*1.6-t+5.2));
 float r=fbm(p*2.2+q*2.5+vec2(t*1.5,-t));float s=fbm(p*4.+q*4.-t);
 vec3 c=mix(C1,C2,smoothstep(.25,.85,r));c=mix(c,C3,smoothstep(.55,.95,s*r*1.6)*.9);
 c+=C3*pow(r,4.)*.9;c*=.55+.6*r;
 c+=vec3(1.)*(stars(uv,90.,T)+stars(uv+.37,160.,T*1.3)*.6);
 gl_FragColor=vec4(vig(c,uv),1.);}`,
    aurora: `void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=uv*vec2(R.x/R.y,1.);
 vec3 c=mix(C1*1.6,C1*.4,uv.y);
 for(int i=0;i<3;i++){float fi=float(i);
  float y=.62+fi*.08+sin(p.x*1.4+T*.18+fi*2.)*.07+(fbm(vec2(p.x*1.2+T*.05,fi))-.5)*.25;
  float d=uv.y-y;float band=exp(-abs(d)*(d>0.?7.:22.));
  float streak=.55+.45*vn(vec2(p.x*38.+fi*13.,T*.4));
  vec3 col=mix(C2,C3,fract(fi*.45+p.x*.15+sin(T*.1)*.2));
  c+=col*band*streak*(.55-fi*.1);}
 c+=vec3(1.)*stars(uv,110.,T)*smoothstep(.3,.8,uv.y);
 float hill=.18+fbm(vec2(p.x*2.,1.))*.12;c=mix(c,C1*.25,smoothstep(hill+.005,hill-.005,uv.y));
 gl_FragColor=vec4(vig(c,uv),1.);}`,
    synthsun: `void main(){vec2 uv=gl_FragCoord.xy/R;float ar=R.x/R.y;vec2 p=vec2((uv.x-.5)*ar,uv.y);
 float hz=.42;vec3 sky=mix(C1,C2*.55,smoothstep(hz,1.,uv.y));sky=mix(sky,C1*.6,smoothstep(.75,1.,uv.y));
 vec3 c=sky;vec2 sp=p-vec2(0.,hz+.2);float r=length(sp);
 float sun=smoothstep(.235,.23,r);float stripes=step(.0,sin((uv.y-hz)*90.-T*2.))+step(hz+.2,uv.y);
 sun*=clamp(stripes,0.,1.);vec3 sunc=mix(C2,vec3(1.,.9,.3),smoothstep(hz,hz+.42,uv.y));
 c=mix(c,sunc,sun);c+=C2*.35*exp(-r*5.);
 float m=hz+.04+fbm(vec2(p.x*3.,2.))*.09;if(uv.y<m&&uv.y>hz)c=mix(c,C1*.5,.85);
 if(uv.y<hz){float z=.12/(hz-uv.y+.001);float gx=abs(fract(p.x*z*1.5)-.5);float gz=abs(fract(z*.8+T*.6)-.5);
  float g=smoothstep(.06*z,0.,gx)+smoothstep(.05*z,0.,gz);c=mix(C1*.35,C1*.15,1.-uv.y/hz);
  c+=C3*g*.8*smoothstep(0.,.3,1.-uv.y/hz+.2)+C2*g*.4;c+=C2*.4*exp(-(hz-uv.y)*14.);}
 c+=vec3(1.)*stars(uv,120.,T)*smoothstep(hz+.2,1.,uv.y);
 gl_FragColor=vec4(vig(c,uv),1.);}`,
    caustics: `void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=uv*vec2(R.x/R.y,1.)*3.;
 vec3 c=mix(C1,C2,pow(uv.y,1.4));float t=T*.35;vec2 i=p;float k=0.;
 for(int n=0;n<4;n++){float fn=float(n);i=p+vec2(cos(t-i.x+fn)+sin(t+i.y*1.3),sin(t-i.y+fn)+cos(t+i.x*1.1));
  k+=1./length(vec2(p.x/(sin(i.x+t)+1.6),p.y/(cos(i.y+t)+1.6)));}
 k=pow(k/4.*0.55,3.5);c+=C3*clamp(k,0.,1.)*.55*(.4+uv.y);
 float ray=pow(vn(vec2(uv.x*7.+uv.y*1.5+T*.15,0.)),3.)*smoothstep(0.,1.,uv.y);c+=C3*ray*.35;
 c+=C3*.12*smoothstep(.85,1.,uv.y);gl_FragColor=vec4(vig(c,uv),1.);}`,
    lava: `void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=uv*vec2(R.x/R.y,1.)*2.2;
 float t=T*.06;vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,-t)));
 float f=fbm(p*1.3+q*2.2+vec2(t*.5,-t*1.4));float cr=1.-abs(f-.5)*2.;cr=pow(cr,6.);
 vec3 c=mix(C1,C2*.6,smoothstep(.3,.75,f));c+=C2*cr*1.2+C3*pow(cr,3.)*1.3;
 c+=C3*.2*smoothstep(.5,0.,uv.y)*(.6+.4*sin(T*1.5+p.x*2.));c*=.72;
 gl_FragColor=vec4(vig(c,uv),1.);}`,
    silk: `void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=uv*vec2(R.x/R.y,1.);float t=T*.12;
 float w=sin(p.x*2.4+sin(p.y*3.1+t)*1.4+t)+sin(p.y*2.2-p.x*1.3+t*1.3)*.8+sin((p.x+p.y)*1.7-t*.7)*.6;
 float v=w*.25+.5;float sheen=pow(1.-abs(fract(w*.9+t*.3)-.5)*2.,9.);
 vec3 c=mix(C1,C2,smoothstep(.1,.9,v));c=mix(c,C3,smoothstep(.75,1.,v)*.6);c+=C3*sheen*.35;
 c+=vec3(1.)*stars(uv,70.,T)*.5;gl_FragColor=vec4(vig(c,uv),1.);}`,
    rays: `void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=(uv-vec2(.5,1.05))*vec2(R.x/R.y,1.);
 float a=atan(p.x,-p.y);float r=length(p);vec3 c=mix(C2,C1,smoothstep(.0,1.25,r));
 float burst=smoothstep(.2,.9,.5+.5*sin(a*18.+T*.15))*.5+smoothstep(.3,1.,.5+.5*sin(a*7.-T*.1))*.5;
 float god=pow(vn(vec2(a*9.,T*.12)),2.5);c+=C3*(burst*.18+god*.45)*exp(-r*1.2);
 c+=C3*.5*exp(-r*3.5);float dust=stars(uv+vec2(0.,T*.01),60.,T*.6);c+=C3*dust*.8;
 gl_FragColor=vec4(vig(c,uv),1.);}`,
    bokeh: `void main(){vec2 uv=gl_FragCoord.xy/R;float ar=R.x/R.y;vec2 p=vec2(uv.x*ar,uv.y);
 vec3 c=mix(C1,C2*.35,uv.y*.7+fbm(p*2.+T*.03)*.4);
 for(int i=0;i<26;i++){float fi=float(i);vec2 o=vec2(h1(vec2(fi,1.3))*ar,h1(vec2(fi,7.1)));
  o+=vec2(sin(T*.07+fi)*.08,mod(T*.012*(.5+h1(vec2(fi,2.))),1.2)-.1);o.y=mod(o.y,1.2)-.1;
  float rad=.03+h1(vec2(fi,4.4))*.075;float d=length(p-o);
  float disc=smoothstep(rad,rad*.82,d)*(.55+.45*smoothstep(rad*.7,rad,d));
  vec3 col=mix(C2,C3,h1(vec2(fi,9.9)));c+=col*disc*(.12+.14*h1(vec2(fi,3.3)))*(.7+.3*sin(T*.8+fi));}
 gl_FragColor=vec4(vig(c,uv),1.);}`,
    smoke: `void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=uv*vec2(R.x/R.y,1.)*1.8;float t=T*.05;
 vec2 q=vec2(fbm(p+t),fbm(p+vec2(3.3,1.1)-t));vec2 r=vec2(fbm(p+q*3.+vec2(1.7,9.2)+t*1.5),fbm(p+q*3.+vec2(8.3,2.8)-t));
 float f=fbm(p+r*2.);vec3 c=mix(C1,C2,clamp(f*f*2.,0.,1.));c=mix(c,C1*.6,clamp(length(q)*.6,0.,1.));
 vec2 mp=uv-vec2(.82,.85);float moon=exp(-length(mp*vec2(R.x/R.y,1.))*5.);c+=C3*moon*.55;
 c+=C3*pow(f,5.)*.6;gl_FragColor=vec4(vig(c*1.1,uv),1.);}`,
    plasma: `void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=uv*vec2(R.x/R.y,1.)*3.;float t=T*.35;
 float v=sin(p.x+t)+sin((p.y+t)*.8)+sin((p.x+p.y+t)*.6)+sin(length(p-vec2(2.,1.5))*2.-t);
 vec3 c=mix(C1,C2,.5+.5*sin(v*1.2));c=mix(c,C3,smoothstep(.6,1.,.5+.5*sin(v*1.2+2.))*.5);c*=.55;
 for(int i=0;i<3;i++){float fi=float(i);float a=sin(T*.5+fi*2.1)*.6;vec2 o=vec2(.2+fi*.3,1.1);
  vec2 d=uv-o;float ang=atan(d.x,-d.y)-a;c+=mix(C2,C3,fi*.5)*smoothstep(.12,0.,abs(ang))*.35*smoothstep(1.4,.2,length(d));}
 c+=vec3(1.)*stars(uv,50.,T*3.)*.6;gl_FragColor=vec4(vig(c,uv),1.);}`,
    matrix: `void main(){vec2 uv=gl_FragCoord.xy/R;vec2 g=uv*vec2(R.x/R.y,1.)*vec2(46.,26.);vec2 id=floor(g);vec2 f=fract(g);
 float sp=.3+h1(vec2(id.x,1.))*.9;float y=fract(id.y*.035+T*sp*.18+h1(vec2(id.x,5.)));
 float head=smoothstep(.97,1.,y);float trail=pow(y,6.);float glyph=step(.35,h1(id+floor(T*6.*sp)))*step(.15,f.x)*step(f.x,.85)*step(.1,f.y)*step(f.y,.9);
 vec3 c=C1;c+=C2*glyph*(trail*.55+head*1.2);c+=vec3(.8)*glyph*head*.5;
 float gy=abs(fract(uv.y*12.-T*.2)-.5);c+=C3*.06*smoothstep(.04,0.,gy);c*=.85+.15*sin(uv.y*R.y*1.5);
 gl_FragColor=vec4(vig(c,uv),1.);}`,
    tunnel: `void main(){vec2 uv=gl_FragCoord.xy/R;vec2 p=(uv-.5)*vec2(R.x/R.y,1.);float r=length(p);float a=atan(p.y,p.x);
 float z=.35/(r+.02)+T*.5;float tex=vn(vec2(a*3.8197,z*2.));float rings=smoothstep(.1,0.,abs(fract(z*.6)-.5)-.38);
 float spokes=smoothstep(.03,0.,abs(fract(a*1.909+.5)-.5)-.46);vec3 c=mix(C1,C2*.75,tex*smoothstep(0.,.6,r))*smoothstep(0.,.5,r)*.75;
 c+=C3*(rings+spokes)*.2*smoothstep(.05,.6,r);c+=C3*.3*exp(-r*9.);c=mix(c,C1,.25);gl_FragColor=vec4(vig(c,uv),1.);}`,
  };
  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  class ShaderBG {
    constructor(canvas) {
      this.cv = canvas;
      this.ok = false;
      this.progs = {};
      this.scale = 0.6;
      try {
        const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'low-power' });
        if (!gl) return;
        this.gl = gl;
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        this.ok = true;
      } catch (e) { this.ok = false; }
      this.resize();
      root.addEventListener('resize', () => this.resize());
      this.slowFrames = 0;
    }
    resize() {
      const s = this.scale * Math.min(2, root.devicePixelRatio || 1);
      this.cv.width = Math.max(2, Math.round(root.innerWidth * s));
      this.cv.height = Math.max(2, Math.round(root.innerHeight * s));
      if (this.gl) this.gl.viewport(0, 0, this.cv.width, this.cv.height);
    }
    prog(name) {
      if (this.progs[name]) return this.progs[name];
      const gl = this.gl;
      const mk = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('shader', name, gl.getShaderInfoLog(s)); return null; }
        return s;
      };
      const vs = mk(gl.VERTEX_SHADER, VERT), fs = mk(gl.FRAGMENT_SHADER, HEAD + (SH[name] || SH.bokeh));
      if (!vs || !fs) return null;
      const p = gl.createProgram();
      gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
      const o = { p, a: gl.getAttribLocation(p, 'a'), R: gl.getUniformLocation(p, 'R'), T: gl.getUniformLocation(p, 'T'),
        C1: gl.getUniformLocation(p, 'C1'), C2: gl.getUniformLocation(p, 'C2'), C3: gl.getUniformLocation(p, 'C3') };
      this.progs[name] = o;
      return o;
    }
    setTheme(th) {
      this.name = th.shader || 'bokeh';
      const sc = th.sc || [th.bg[0], th.bg[1], th.accent];
      this.cols = sc.map((h) => U.hexToRgb(h).map((v) => v / 255));
      this.cv.style.background = `linear-gradient(${th.bg[0]}, ${th.bg[1]})`;
      if (this.ok) this.cur = this.prog(this.name);
    }
    draw(tms, dt) {
      if (!this.ok || !this.cur) return;
      // adaptive resolution for weak GPUs
      if (dt > 0.03) { this.slowFrames++; if (this.slowFrames > 90 && this.scale > 0.3) { this.scale = 0.3; this.resize(); } } else this.slowFrames = 0;
      const gl = this.gl, o = this.cur;
      gl.useProgram(o.p);
      gl.enableVertexAttribArray(o.a);
      gl.vertexAttribPointer(o.a, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(o.R, this.cv.width, this.cv.height);
      gl.uniform1f(o.T, (tms / 1000) % 3600);
      gl.uniform3fv(o.C1, this.cols[0]); gl.uniform3fv(o.C2, this.cols[1]); gl.uniform3fv(o.C3, this.cols[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }
  ShaderBG.NAMES = Object.keys(SH);
  root.ShaderBG = ShaderBG;
})(window);
