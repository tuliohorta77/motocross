// Timoneiro · visão 3D (cabine e perseguição). Usa o mesmo mundo e as mesmas regras do jogo de cima;
// aqui só se desenha. Coordenadas: x do jogo → X (centro do rio em 0), y do jogo (rio acima) → -Z, altura → Y.
import * as THREE from './vendor/three.module.min.js';

export function create(api, host) {
  const TAU = Math.PI * 2;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const el = renderer.domElement; el.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:0';
  host.prepend(el);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, 1, 0.5, 5000);
  let camMode = 'cabine';
  const P = (x, y, h = 0) => new THREE.Vector3(x - 200, h, -y);

  // ---------- céu ----------
  const skyU = { top: { value: new THREE.Color('#2f7fc4') }, mid: { value: new THREE.Color('#9fd3ef') }, bot: { value: new THREE.Color('#d9eef7') }, sun: { value: new THREE.Vector3(-.4, .55, -.75).normalize() }, sunOn: { value: 1 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: `varying vec3 vD;void main(){vD=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
    fragmentShader: `uniform vec3 top,mid,bot,sun;uniform float sunOn;varying vec3 vD;
      float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}
      void main(){float y=vD.y;vec3 c=y>0.?mix(mid,top,pow(clamp(y,0.,1.),.6)):bot;c=mix(bot,c,smoothstep(-.02,.08,y));
        float s=max(dot(vD,sun),0.);c+=sunOn*(vec3(1.,.9,.7)*pow(s,600.)*4.+vec3(1.,.85,.6)*pow(s,8.)*.25);
        if(sunOn<.5&&y>0.){vec3 q=floor(vD*300.);float st=step(.9965,h(q));c+=vec3(st)*.9*smoothstep(0.,.2,y);}
        gl_FragColor=vec4(c,1.);}`
  }));
  sky.frustumCulled = false; scene.add(sky);

  // ---------- luzes ----------
  const hemi = new THREE.HemisphereLight('#cfe9ff', '#3d5a2a', .85); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff2dc', 1.6); sun.position.set(-400, 600, -900); scene.add(sun);

  // ---------- água ----------
  const waterU = { uTime: { value: 0 }, deep: { value: new THREE.Color('#0b4f6c') }, shallow: { value: new THREE.Color('#2a9bb5') }, skyC: { value: new THREE.Color('#bfe3f2') },
    sunDir: { value: skyU.sun.value }, sunK: { value: 1 }, fogC: { value: new THREE.Color('#cfe8f3') }, fogN: { value: 700 }, fogF: { value: 3200 } };
    const water = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000, 200, 200).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: waterU,
    vertexShader: `uniform float uTime;varying vec3 vW;varying vec3 vN;
      void main(){vec4 w=modelMatrix*vec4(position,1.);float t=uTime;
        float a1=w.x*.045+t*1.2,a2=w.z*.06-t*1.0,a3=(w.x+w.z)*.1+t*1.9;
        w.y+=sin(a1)*.9+sin(a2)*.7+sin(a3)*.3;
        float dx=cos(a1)*.9*.045+cos(a3)*.3*.1,dz=cos(a2)*.7*.06+cos(a3)*.3*.1;
        vN=normalize(vec3(-dx,1.,-dz));vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float uTime,sunK,fogN,fogF;uniform vec3 deep,shallow,skyC,sunDir,fogC;varying vec3 vW;varying vec3 vN;
      void main(){vec3 n=normalize(vN+vec3(sin(vW.x*.7+uTime*3.1)*.05+sin(vW.z*1.3+uTime*2.)*.04,0.,cos(vW.z*.9-uTime*2.6)*.05+cos(vW.x*1.7-uTime*1.7)*.04));
        vec3 v=normalize(cameraPosition-vW);float fr=pow(1.-max(dot(n,v),0.),4.);
        vec3 c=mix(deep,shallow,.35+.25*n.x);c=mix(c,skyC,clamp(fr,0.,.85));
        float sp=pow(max(dot(reflect(-sunDir,n),v),0.),120.)*2.5*sunK;c+=vec3(1.,.95,.85)*sp;
        float d=length(cameraPosition-vW);c=mix(c,fogC,smoothstep(fogN,fogF,d));gl_FragColor=vec4(c,1.);}`
  }));
  scene.add(water);

  // ---------- texturas ----------
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t };
  const glowTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.18, 'rgba(255,255,255,.85)'); r.addColorStop(.45, 'rgba(255,255,255,.25)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128) });
  const glow = (col, s = 20) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); m.scale.set(s, s, 1); return m };
  const signTex = {};
  function signTexture(sym) {
    if (signTex[sym]) return signTex[sym];
    return signTex[sym] = canvasTex(128, 128, (g) => {
      const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath() };
      if (sym === 'tri-r' || sym === 'tri-g') { g.clearRect(0, 0, 128, 128); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(64, 8); g.lineTo(122, 116); g.lineTo(6, 116); g.closePath(); g.fill(); g.fillStyle = sym === 'tri-r' ? '#d7263d' : '#139a52'; g.beginPath(); g.moveTo(64, 26); g.lineTo(106, 106); g.lineTo(22, 106); g.closePath(); g.fill(); return }
      if (sym === 'R') { g.fillStyle = '#ff7b00'; rr(g, 4, 4, 120, 120, 12); g.fill(); g.lineWidth = 6; g.strokeStyle = '#7a3b00'; g.stroke(); g.fillStyle = '#111'; g.font = '900 86px Nunito,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('R', 64, 70); return }
      g.fillStyle = '#fff'; rr(g, 4, 4, 120, 120, 12); g.fill(); g.lineWidth = 6; g.strokeStyle = '#333'; g.stroke(); g.fillStyle = '#111'; g.strokeStyle = '#111'; g.lineWidth = 12;
      if (sym === 'sq') g.strokeRect(34, 34, 60, 60);
      else if (sym === 'plus') { g.beginPath(); g.moveTo(64, 28); g.lineTo(64, 100); g.moveTo(28, 64); g.lineTo(100, 64); g.stroke() }
      else { g.font = '900 86px Nunito,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sym, 64, 70) }
    })
  }
  const label = (lines, w = 256) => { const t = canvasTex(w, 96, (g) => { g.fillStyle = 'rgba(6,40,61,.85)'; g.beginPath(); g.roundRect ? g.roundRect(4, 4, w - 8, 88, 18) : g.rect(4, 4, w - 8, 88); g.fill(); g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '900 30px Nunito,sans-serif'; g.fillText(lines[0], w / 2, 40); g.fillStyle = '#bfe3f2'; g.font = '700 22px Nunito,sans-serif'; g.fillText(lines[1] || '', w / 2, 72) }); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(w / 4, 24, 1); s.renderOrder = 10; return s };

  // ---------- materiais ----------
  const M = {};
  const mat = (c, o = {}) => M[c + JSON.stringify(o)] || (M[c + JSON.stringify(o)] = new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .05, ...o }));
  const COL = { red: '#d7263d', green: '#139a52', yel: '#ffcf1f', blk: '#1b1f24', white: '#f4f4ef' };

  // ---------- casco (mesmo contorno do jogo de cima) ----------
  function hullShape(L, B) {
    const s = new THREE.Shape();
    s.moveTo(0, L / 2); s.bezierCurveTo(B * .62, L * .3, B * .54, -L * .1, B * .48, -L * .46); s.quadraticCurveTo(B * .46, -L / 2, B * .3, -L / 2);
    s.lineTo(-B * .3, -L / 2); s.quadraticCurveTo(-B * .46, -L / 2, -B * .48, -L * .46); s.bezierCurveTo(-B * .54, -L * .1, -B * .62, L * .3, 0, L / 2); return s
  }
  function boatMesh(hull = '#ffffff', stripe = '#0f4c81', k = 1, cockpit = false) {
    const L = 46 * k, Bm = 17 * k, g = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(hullShape(L, Bm), { depth: 6 * k, bevelEnabled: true, bevelThickness: 1.2 * k, bevelSize: 1.2 * k, bevelSegments: 2, curveSegments: 18 }).rotateX(-Math.PI / 2);
    const h = new THREE.Mesh(geo, mat(hull, { roughness: .35 })); h.position.y = -2.2 * k; g.add(h);
    const st = new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape(L * 1.005, Bm * 1.005), { depth: .9 * k, bevelEnabled: false, curveSegments: 18 }).rotateX(-Math.PI / 2), mat(stripe)); st.position.y = 2.4 * k; g.add(st);
    const deck = new THREE.Mesh(new THREE.ShapeGeometry(hullShape(L * .86, Bm * .82), 18).rotateX(-Math.PI / 2), mat('#c98f55', { roughness: .8 })); deck.position.y = 3.95 * k; g.add(deck);
    // console e para-brisa
    const con = new THREE.Mesh(new THREE.BoxGeometry(Bm * .5, 4.5 * k, 5 * k), mat('#f1eee6')); con.position.set(0, 6 * k, -1 * k); g.add(con);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(Bm * .78, 4.2 * k, .4 * k), new THREE.MeshStandardMaterial({ color: '#7fb6d9', transparent: true, opacity: cockpit ? .12 : .55, roughness: .05, metalness: .3 }));
    ws.position.set(0, 9.4 * k, -4.6 * k); ws.rotation.x = -.45; g.add(ws);
    const fr = mat('#1d2a35'); for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.6 * k, 4.8 * k, .6 * k), fr); p.position.set(sx * Bm * .39, 9.3 * k, -4.6 * k); p.rotation.x = -.45; g.add(p) }
    const top = new THREE.Mesh(new THREE.BoxGeometry(Bm * .8, .6 * k, .8 * k), fr); top.position.set(0, 11.3 * k, -5.6 * k); g.add(top); g.userData.cabin = [top, ws, con];
    const seat = new THREE.Mesh(new THREE.BoxGeometry(Bm * .6, 2.4 * k, 5 * k), mat('#e7e1d4')); seat.position.set(0, 5.2 * k, 9 * k); g.add(seat);
    const mot = new THREE.Mesh(new THREE.BoxGeometry(Bm * .34, 7 * k, 4.5 * k), mat('#1d252d', { roughness: .3 })); mot.position.set(0, 3 * k, L / 2 + 1.6 * k); g.add(mot);
    // luzes de bordo
    const lr = new THREE.Mesh(new THREE.SphereGeometry(.9 * k, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff3040' })); lr.position.set(-Bm * .36, 4.6 * k, -L * .24); g.add(lr);
    const lg = new THREE.Mesh(new THREE.SphereGeometry(.9 * k, 10, 8), new THREE.MeshBasicMaterial({ color: '#22d36b' })); lg.position.set(Bm * .36, 4.6 * k, -L * .24); g.add(lg);
    const gr = glow('#ff3040', 9 * k), gg = glow('#22d36b', 9 * k), gw = glow('#ffffff', 9 * k), gs = glow('#ffffff', 7 * k);
    gr.position.copy(lr.position); gg.position.copy(lg.position); gw.position.set(0, 12.5 * k, -5 * k); gs.position.set(0, 5 * k, L / 2 + 3 * k); g.add(gr, gg, gw, gs);
    g.userData.navGlows = [gr, gg, gw, gs];
    return g
  }
  function bargeMesh(seed) {
    const g = new THREE.Group(); const h = new THREE.Mesh(new THREE.BoxGeometry(30, 9, 110), mat('#7a3f25')); h.position.y = 1.5; g.add(h);
    const cc = ['#2a6fdb', '#e0b100', '#d7263d', '#139a52', '#7d4cc2']; for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(24, 9, 13), mat(cc[(i + seed) % 5])); c.position.set(0, 10.5, -44 + i * 15); g.add(c) }
    const cab = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 18), mat('#e9e4da')); cab.position.set(0, 13, 44); g.add(cab);
    const win = new THREE.Mesh(new THREE.BoxGeometry(24.2, 3, 14), mat('#173b55')); win.position.set(0, 17, 44); g.add(win);
    const gr = glow('#ff3040', 12), gg = glow('#22d36b', 12), gw = glow('#fff', 12); gr.position.set(-13, 8, -52); gg.position.set(13, 8, -52); gw.position.set(0, 24, 40); g.add(gr, gg, gw); g.userData.navGlows = [gr, gg, gw];
    return g
  }
  function sailMesh() {
    const g = boatMesh('#ffffff', '#1d3a55', .95); g.children.filter(c => c.geometry && c.geometry.type === 'BoxGeometry' && c.position.y > 8).forEach(c => g.remove(c));
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.5, .6, 55, 8), mat('#cfd6dc', { metalness: .6, roughness: .3 })); mast.position.set(0, 30, -6); g.add(mast);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute([0, 56, -6, 0, 8, -6, 0, 9, 16], 3)); sg.computeVertexNormals();
    const sail = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: '#f6f4ee', side: THREE.DoubleSide, roughness: .9 })); g.add(sail); g.userData.sail = sail;
    return g
  }

  // ---------- boias ----------
  function buoyMesh(kind) {
    const g = new THREE.Group();
    const bands = { 'lat-r': [COL.red, COL.red, COL.red], 'lat-g': [COL.green, COL.green, COL.green], 'card-N': [COL.yel, COL.blk, COL.blk], 'card-S': [COL.blk, COL.yel, COL.yel], 'card-E': [COL.blk, COL.yel, COL.blk], 'card-W': [COL.yel, COL.blk, COL.yel], iso: [COL.blk, COL.red, COL.blk], seg: [COL.white, COL.white, COL.white] }[kind];
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8, 3.2, 20), mat(bands[0])); fl.position.y = .6; g.add(fl);
    const H = 18, n = 3;
    for (let i = 0; i < n; i++) { const r0 = 6.2 - i * 1.1, r1 = 6.2 - (i + 1) * 1.1; let m = mat(bands[i]);
      if (kind === 'seg') m = new THREE.MeshStandardMaterial({ map: stripeTex(), roughness: .55 });
      const b = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, H / n, 20), m); b.position.y = 2.2 + (i + .5) * H / n; g.add(b) }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, 5, 6), mat('#2a2f35')); mast.position.y = 2.2 + H + 2.5; g.add(mast);
    const T = 2.2 + H + 5.5, blk = mat(COL.blk);
    const cone = (up, y, m = blk) => { const c = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.8, 18), m); c.position.y = y; if (!up) c.rotation.x = Math.PI; g.add(c) };
    const ball = (y, m = blk, r = 2.1) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); s.position.y = y; g.add(s) };
    if (kind === 'lat-r') cone(true, T + 1.4, mat(COL.red));
    else if (kind === 'lat-g') { const c = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 4, 16), mat(COL.green)); c.position.y = T + 1.6; g.add(c) }
    else if (kind === 'card-N') { cone(true, T + 1.4); cone(true, T + 5.6) }
    else if (kind === 'card-S') { cone(false, T + 1.4); cone(false, T + 5.6) }
    else if (kind === 'card-E') { cone(false, T + 1.4); cone(true, T + 5.2) }      // base com base
    else if (kind === 'card-W') { cone(true, T + 1.4); cone(false, T + 5.2) }      // ponta com ponta
    else if (kind === 'iso') { ball(T + 1.6); ball(T + 6.2) }
    else if (kind === 'seg') ball(T + 1.8, mat(COL.red), 2.4);
    const lt = glow('#fff', 26); lt.position.y = T + 9; g.add(lt); g.userData.light = lt; g.userData.top = T + 9;
    return g
  }
  let _stripe; function stripeTex() { return _stripe || (_stripe = canvasTex(128, 32, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#d7263d' : '#f4f4ef'; g.fillRect(i * 16, 0, 16, 32) } })) }

  // ---------- mundo da fase ----------
  let world = null, curW = null;
  const vesMap = new Map();
  function clearWorld() { if (world) { scene.remove(world); world.traverse(o => { if (o.geometry) o.geometry.dispose() }) } world = null; vesMap.forEach(m => scene.remove(m)); vesMap.clear() }
  function bankProfile(d) { const pts = [[-14, -5], [0, .8], [10, 2.6], [24, 5.5], [70, 10], [500, 16]]; for (let i = 1; i < pts.length; i++) if (d <= pts[i][0]) { const a = pts[i - 1], b = pts[i], t = (d - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * t } return 16 }
  function build(W) {
    clearWorld(); curW = W; world = new THREE.Group(); scene.add(world);
    const night = !!W.night, L = W.L;
    // margens: faixa de cada lado, com areia junto à água e grama mais acima
    const prof = [[-14, '#8d7a55'], [0, '#d9c08a'], [10, '#e8d3a2'], [24, '#6aa84f'], [70, '#4f8f3a'], [500, '#3f7a2e']];
    const y0 = -700, y1 = Math.max(L.len, W.end < 1e8 ? W.end : L.len) + 1400, st = 12, rows = Math.ceil((y1 - y0) / st) + 1;
    for (const side of [-1, 1]) {
      const pos = [], col = [], idx = []; const cc = new THREE.Color();
      for (let r = 0; r < rows; r++) { const y = y0 + r * st, R = W.at(y), nz = Math.sin(y * .05) * 3 + Math.sin(y * .13) * 2, edge = side < 0 ? R.c - R.w + nz : R.c + R.w - nz;
        for (let k = 0; k < prof.length; k++) { const d = prof[k][0], x = edge + side * d; const bump = k >= 3 ? (Math.sin(y * .021 + k) * 1.6 + Math.sin(x * .03) * 1.2) : 0;
          pos.push(x - 200, bankProfile(d) + bump, -y); cc.set(prof[k][1]); const v = .92 + .08 * Math.sin(y * .07 + k * 2.1); col.push(cc.r * v, cc.g * v, cc.b * v) } }
      const n = prof.length; for (let r = 0; r < rows - 1; r++) for (let k = 0; k < n - 1; k++) { const a = r * n + k, b = a + 1, c = a + n, d = c + 1; if (side < 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c) }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
      world.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })));
      // espuma na beira
      const fp = [], fi = []; for (let r = 0; r < rows; r++) { const y = y0 + r * st, R = W.at(y), nz = Math.sin(y * .05) * 3 + Math.sin(y * .13) * 2, e = side < 0 ? R.c - R.w + nz : R.c + R.w - nz; fp.push(e - 200, 1.1, -y, e - 200 - side * 7, .9, -y) }
      for (let r = 0; r < rows - 1; r++) { const a = r * 2; fi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setIndex(fi);
      world.add(new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: night ? .12 : .55, side: THREE.DoubleSide, depthWrite: false })));
    }
    // ilhas
    for (const i of W.islands) { const s = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), new THREE.MeshLambertMaterial({ color: '#4f8f3a' })); s.scale.set(i.rx - 2, 9, i.ry - 4); s.position.copy(P(i.x, i.y, -1)); world.add(s);
      const sa = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2, 32), new THREE.MeshLambertMaterial({ color: '#e3c78f' })); sa.scale.set(i.rx + 6, 1, i.ry + 6); sa.position.copy(P(i.x, i.y, .4)); world.add(sa) }
    // árvores (instanciadas)
    const tr = W.trees, crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: '#3f8d32', flatShading: true }), tr.length);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .25, 1, 6), new THREE.MeshLambertMaterial({ color: '#6b4b2a' }), tr.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), cl = new THREE.Color();
    tr.forEach((t, i) => { const R = W.at(t.y), d = Math.abs(t.x - R.c) - R.w, gh = t.isl ? 8 : bankProfile(d); const r = t.r * 1.25, th = t.palm ? r * 3.2 : r * 1.4;
      m4.compose(P(t.x, t.y, gh + th / 2), q, sc.set(r * .55, th, r * .55)); trunk.setMatrixAt(i, m4);
      m4.compose(P(t.x, t.y, gh + th + (t.palm ? 0 : r * .55)), q, t.palm ? sc.set(r * 1.3, r * .45, r * 1.3) : sc.set(r, r * 1.15, r)); crown.setMatrixAt(i, m4);
      cl.setHSL(.28 + (Math.sin(t.x * 7 + t.y) * .03), .5, t.palm ? .38 : .3 + (Math.cos(t.y * 3) * .06)); crown.setColorAt(i, cl) });
    world.add(trunk, crown);
    // boias, placas e pontes
    W.objs.forEach(o => {
      if (o.t === 'lat' || o.t === 'card' || o.t === 'iso' || o.t === 'seg') { const k = o.t === 'lat' ? (o.col === 'r' ? 'lat-r' : 'lat-g') : o.t === 'card' ? 'card-' + o.k : o.t; const m = buoyMesh(k); m.position.copy(P(o.x, o.y)); world.add(m); o._m = m; o._phase = Math.random() * 6 }
      else if (o.t === 'sign') { const R = W.at(o.y), x = o.side === 'L' ? R.c - R.w - 16 : R.c + R.w + 16; const g = new THREE.Group(); g.position.copy(P(x, o.y, 3));
        const post = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, 30, 8), mat('#6b4b2a')); post.position.y = 15; g.add(post);
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: signTexture(o.sym) })); pl.position.y = 38; pl.rotation.y = o.side === 'L' ? .5 : -.5; g.add(pl);
        const back = new THREE.Mesh(new THREE.PlaneGeometry(22.5, 22.5), mat('#555')); back.position.set(0, 38, -.3); back.rotation.y = pl.rotation.y + Math.PI; g.add(back); world.add(g) }
      else if (o.t === 'bridge') { const R = W.at(o.y), g = new THREE.Group(); const span = R.w * 2 + 260;
        const deck = new THREE.Mesh(new THREE.BoxGeometry(span, 7, 34), mat('#bdb7aa')); deck.position.copy(P(R.c, o.y, 56)); g.add(deck);
        const under = new THREE.Mesh(new THREE.BoxGeometry(span, 1, 30), mat('#6f6a61')); under.position.copy(P(R.c, o.y, 52.3)); g.add(under);
        for (const z of [-16, 16]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(span, 4, 1.2), mat('#8a857c')); rail.position.copy(P(R.c, o.y, 61.5)); rail.position.z += z; g.add(rail) }
        const pils = [...o.pil, R.c - R.w - 8, R.c + R.w + 8];
        pils.forEach((px, i) => { const p = new THREE.Mesh(new THREE.BoxGeometry(i < o.pil.length ? 36 : 28, 70, 22), mat('#b7b1a5')); p.position.copy(P(px, o.y, 18)); g.add(p);
          if (i < o.pil.length) { const s = new THREE.Mesh(new THREE.PlaneGeometry(20, 18), new THREE.MeshBasicMaterial({ map: signTexture(o.mark === 'r' ? 'tri-r' : 'tri-g'), transparent: true })); s.position.copy(P(px, o.y, 26)); s.position.z += 11.2; g.add(s) } });
        // carros
        g.userData.cars = []; const cc = ['#d7263d', '#2a6fdb', '#f3c623', '#ffffff']; for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 7), mat(cc[i], { roughness: .3, metalness: .4 })); c.position.copy(P(R.c, o.y, 62.5)); c.position.z += i % 2 ? -7 : 7; g.add(c); g.userData.cars.push({ m: c, sp: i % 2 ? 60 : -50, ph: i * 170, span }) }
        world.add(g); o._m = g }
    });
    // pedras visíveis
    for (const k of W.rocks) addRock(k);
    W._rockN = W.rocks.length;
    // porto
    if (W.port) { const yy = W.end + 60, R = W.at(yy); const pier = new THREE.Mesh(new THREE.BoxGeometry(R.w * 2 + 80, 3, 22), mat('#b98654')); pier.position.copy(P(R.c, yy + 90, 3)); world.add(pier);
      houses(R.c, yy + 170, 5) }
    if (W.marina) buildMarina(W);
    if (W.anch) for (const s of W.anch.spots) { const ring = new THREE.Mesh(new THREE.RingGeometry(38, 42, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .55, depthWrite: false })); ring.position.copy(P(s.x, s.y, 1.6)); world.add(ring);
      const lb = label([s.name, s.info]); lb.position.copy(P(s.x, s.y, 30)); world.add(lb) }
    // céu e neblina conforme dia/noite
    if (night) { skyU.top.value.set('#020611'); skyU.mid.value.set('#0b1630'); skyU.bot.value.set('#0e1d3a'); skyU.sunOn.value = 0; hemi.intensity = .12; sun.intensity = .15; sun.color.set('#9fb6ff');
      waterU.deep.value.set('#03111f'); waterU.shallow.value.set('#0a2840'); waterU.skyC.value.set('#14284a'); waterU.sunK.value = .15; waterU.fogC.value.set('#0e1d3a'); waterU.fogN.value = 250; waterU.fogF.value = 1800; renderer.toneMappingExposure = .9 }
    else { skyU.top.value.set('#2f7fc4'); skyU.mid.value.set('#9fd3ef'); skyU.bot.value.set('#d9eef7'); skyU.sunOn.value = 1; hemi.intensity = .85; sun.intensity = 1.6; sun.color.set('#fff2dc');
      waterU.deep.value.set('#0b4f6c'); waterU.shallow.value.set('#2a9bb5'); waterU.skyC.value.set('#bfe3f2'); waterU.sunK.value = 1; waterU.fogC.value.set('#d9eef7'); waterU.fogN.value = 700; waterU.fogF.value = 3200; renderer.toneMappingExposure = 1.05 }
    scene.fog = null;
    // lancha do jogador
    player = boatMesh('#ffffff', '#0f4c81', 1.15, true); world.add(player);
    mobG = null; marks = null;
  }
  function addRock(k) { if (!k.r || k.hidden) return; const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const a = i * 1.3 + k.x, r = k.r * (.28 + .12 * (i % 3)); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat('#5d574d', { roughness: .95, flatShading: true })); m.position.copy(P(k.x + Math.cos(a) * k.r * .5, k.y + Math.sin(a) * k.r * .35, r * .25)); m.rotation.set(a, a * 2, a * .5); g.add(m) } world.add(g) }
  function houses(cx, y, n) { const cols = ['#d76d3b', '#c0392b', '#e08e45', '#a84a2b', '#2a6fdb', '#139a52']; for (let i = 0; i < n; i++) { const x = cx - 160 + i * 80; const b = new THREE.Mesh(new THREE.BoxGeometry(46, 26, 36), mat('#efe6d6')); b.position.copy(P(x, y + (i % 2) * 20, 18)); world.add(b);
    const r = new THREE.Mesh(new THREE.ConeGeometry(36, 18, 4), mat(cols[i % cols.length])); r.rotation.y = Math.PI / 4; r.position.copy(P(x, y + (i % 2) * 20, 40)); world.add(r) } }
  function buildMarina(W) { const Mr = W.marina, Pq = Mr.P;
    const quay = new THREE.Mesh(new THREE.BoxGeometry(1400, 10, 70), mat('#bdb6a8')); quay.position.copy(P(200, Pq + 35, 0)); world.add(quay);
    houses(200, Pq + 140, 6);
    for (const fx of Mr.fx) { const f = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 86), mat('#b07a45', { roughness: .9 })); f.position.copy(P(fx, Pq - 43, 2)); world.add(f) }
    for (const b of Mr.boats) { const m = boatMesh(b.hull, '#24364a', 1.05); m.position.copy(P(b.x, b.y)); m.userData.navGlows.forEach(s => s.visible = false); world.add(m) }
    const tx = Mr.slots[Mr.target]; const t = canvasTex(64, 128, (g) => { g.fillStyle = 'rgba(120,255,170,.25)'; g.fillRect(0, 0, 64, 128); g.strokeStyle = '#7dffaa'; g.lineWidth = 6; g.setLineDash([12, 9]); g.strokeRect(4, 4, 56, 120); g.fillStyle = '#fff'; g.font = '900 13px Nunito,sans-serif'; g.textAlign = 'center'; g.fillText('VAGA', 32, 120) });
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(42, 80).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); slot.position.copy(P(tx, Pq - 44, 1.4)); world.add(slot) }

  // ---------- rastro e partículas ----------
  const wakePool = [], partPool = [];
  const wakeMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false });
  for (let i = 0; i < 160; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), wakeMat.clone()); m.visible = false; scene.add(m); wakePool.push(m) }
  for (let i = 0; i < 120; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false })); s.visible = false; scene.add(s); partPool.push(s) }

  let player = null, mobG = null, marks = null, roll = 0, fovS = 68, last = performance.now();
  const tmpV = new THREE.Vector3();
  function vesselMesh(v) { let m = vesMap.get(v); if (m) return m;
    m = v.kind === 'barcaca' ? bargeMesh(v.seed || 0) : v.kind === 'veleiro' ? sailMesh() : v.kind === 'patrulha' ? boatMesh('#c8d0d8', '#24364a', 1.05) : boatMesh(v.hull || '#f3c623', '#7a2e00', 1);
    if (v.kind === 'patrulha') { const s = glow('#3aa0ff', 18); s.position.set(0, 14, 0); m.add(s); m.userData.siren = s }
    scene.add(m); vesMap.set(v, m); return m }

  function lightOn(o, t) { if (o.t === 'lat') return ((t + o.y * .013) % 3) < 1.1; if (o.t === 'card') { const q = (t * 6 + o.y * .01) % 10; return q < .5 || (q > 1 && q < 1.5) || (q > 2 && q < 2.5) } if (o.t === 'iso') { const q = (t + o.y * .01) % 5; return q < .4 || (q > .8 && q < 1.2) } return (t % 6) < 3 }

  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }
  addEventListener('resize', resize); resize();

  function render() {
    const W = api.W, B = api.B, t = api.time; if (!W || !B) return;
    if (W !== curW) build(W);
    const night = !!W.night;
    if (W.rocks.length !== W._rockN) { for (let i = W._rockN; i < W.rocks.length; i++) addRock(W.rocks[i]); W._rockN = W.rocks.length }
    waterU.uTime.value = t;
    // lancha
    const bp = P(B.x, B.y);
    let sinkK = B.sunk ? Math.min(1, (api.run.sinkT || 0) * 1.5) : 0;
    player.position.set(bp.x, Math.sin(t * 2.1) * .5 - sinkK * 18, bp.z);
    const pitch = -Math.min(.07, Math.abs(B.v) / 150 * .07) + Math.sin(t * 1.7) * .012;
    roll += ((-B.rud * Math.min(1, Math.abs(B.v) / 90) * .12) - roll) * .08;
    player.rotation.set(pitch + sinkK * .5, -B.h, roll + Math.sin(t * 1.3) * .015 + sinkK * .6, 'YXZ');
    const cab = camMode === 'cabine'; player.userData.navGlows.forEach((s, i) => s.visible = night && (!cab || i < 2)); player.userData.cabin.forEach(m => m.visible = !cab);
    // câmera
    const shake = api.shake || 0, sh = () => (Math.random() - .5) * shake * .25;
    if (camMode === 'cabine') {
      tmpV.set(0, 13.5, 5.5).applyEuler(player.rotation).add(player.position); camera.position.copy(tmpV); camera.position.x += sh(); camera.position.y += sh();
      const fwd = new THREE.Vector3(0, -.07, -1).applyEuler(player.rotation); camera.up.set(0, 1, 0).applyAxisAngle(fwd.clone().normalize(), -roll * .6);
      camera.lookAt(tmpV.clone().add(fwd.multiplyScalar(100)));
    } else {
      const back = new THREE.Vector3(0, 46, 130).applyAxisAngle(new THREE.Vector3(0, 1, 0), -B.h); const want = player.position.clone().add(back);
      camera.position.lerp(want, .12); camera.up.set(0, 1, 0); camera.lookAt(player.position.clone().add(new THREE.Vector3(Math.sin(B.h) * 60, 10, -Math.cos(B.h) * 60)));
    }
    const fovT = 66 + Math.min(18, Math.abs(B.v) * .11); fovS += (fovT - fovS) * .05; camera.fov = fovS; camera.updateProjectionMatrix();
    // água e céu seguem a câmera
    water.position.set(Math.round(camera.position.x / 25) * 25, 0, Math.round(camera.position.z / 25) * 25); sky.position.copy(camera.position);
    // boias: balanço e luzes
    for (const o of W.objs) { if (!o._m) continue; if (o.t === 'bridge') { for (const c of o._m.userData.cars) { c.m.position.x = ((((t * c.sp + c.ph) % c.span) + c.span) % c.span) - c.span / 2 + (W.at(o.y).c - 200) } continue }
      const m = o._m; m.position.y = Math.sin(t * 2 + o._phase) * .8; m.rotation.z = Math.sin(t * 1.4 + o._phase) * .05; m.rotation.x = Math.cos(t * 1.1 + o._phase) * .04;
      const lt = m.userData.light; if (!lt) continue; if (!night) { lt.visible = false; continue } lt.visible = true;
      lt.material.color.set(o.t === 'lat' ? (o.col === 'r' ? '#ff3a4a' : '#2bf07a') : '#ffffff'); const on = lightOn(o, t); lt.scale.setScalar(on ? 44 : 9); lt.material.opacity = on ? 1 : .55 }
    // outras embarcações
    const alive = new Set(W.vessels);
    for (const [v, m] of vesMap) if (!alive.has(v)) { scene.remove(m); vesMap.delete(v) }
    for (const v of W.vessels) { const m = vesselMesh(v); const p = P(v.x, v.y); m.position.set(p.x, Math.sin(t * 2 + v.y) * .4, p.z); m.rotation.set(0, -v.h, 0);
      const ng = m.userData.navGlows; if (ng) ng.forEach((s, i) => s.visible = night && (!v.anch || i === 2)); if (v.anch && ng) { ng[2].visible = true; ng[2].scale.setScalar(night ? 26 : 0) }
      if (m.userData.siren) { const on = Math.floor(t * 6) % 2; m.userData.siren.material.color.set(on ? '#3aa0ff' : '#ff3a3a') }
      if (m.userData.sail) m.userData.sail.rotation.y = Math.sin(t * .8) * .05 }
    // homem ao mar
    const mob = api.run && api.run.mob;
    if (mob && mob.phase !== 'ok') { if (!mobG) { mobG = new THREE.Group(); const head = new THREE.Mesh(new THREE.SphereGeometry(2.4, 14, 10), mat('#f1c27d')); head.position.y = 2.6; const vest = new THREE.Mesh(new THREE.SphereGeometry(3.4, 14, 10), mat('#ff7b00')); vest.scale.y = .6;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(4.5, 1.4, 10, 24).rotateX(Math.PI / 2), mat('#ff7b00')); ring.position.set(9, .5, 0); ring.visible = false; mobG.add(head, vest, ring); mobG.userData.ring = ring; const g = glow('#ffffff', 16); g.position.y = 8; mobG.add(g); mobG.userData.g = g; scene.add(mobG) }
      const p = P(mob.x, mob.y); mobG.position.set(p.x, Math.sin(t * 2.5) * .7, p.z); mobG.userData.ring.visible = !!mob.buoy; mobG.userData.g.visible = night }
    else if (mobG) { scene.remove(mobG); mobG = null }
    // rastro
    const wk = api.wake; for (let i = 0; i < wakePool.length; i++) { const m = wakePool[i], w = wk[wk.length - 1 - i]; if (!w) { m.visible = false; continue } const f = 1 - w.t / 3.2, sp = 6 + w.t * 22;
      m.visible = true; const p = P(w.x, w.y, 1.3); m.position.copy(p); m.rotation.y = -w.h; m.scale.set(sp * 2, 1, 7); m.material.opacity = Math.max(0, .45 * f * Math.min(1, w.v / 60)) }
    // partículas (fumaça, espirros)
    const ps = api.parts; for (let i = 0; i < partPool.length; i++) { const s = partPool[i], p = ps[i]; if (!p) { s.visible = false; continue } const f = 1 - p.t / p.life; s.visible = true;
      s.position.copy(P(p.x, p.y, p.smoke ? 8 + p.t * 16 : 2 + Math.sin(f * 3) * 3)); const r = (p.smoke ? p.r * 2.2 : p.r * 2.5); s.scale.set(r, r, 1);
      s.material.color.set(p.smoke ? `rgb(${p.col})` : p.col.startsWith('rgba') ? '#ffffff' : p.col); s.material.opacity = (p.smoke ? .6 : .8) * f; s.material.blending = p.smoke ? THREE.NormalBlending : THREE.AdditiveBlending }
    renderer.render(scene, camera);
  }
  function project(x, y, h) { const v = P(x, y, h).project(camera); if (v.z > 1) return null; return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight] }
  return { render, project, setCam(m) { camMode = m }, get cam() { return camMode }, show(on) { el.style.display = on ? 'block' : 'none' }, dispose() { clearWorld() } };
}
