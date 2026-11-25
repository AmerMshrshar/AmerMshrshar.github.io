/* =========================================================
   Acugnito module ring: a 3D Möbius band carrying the six
   ERP modules, with documents flowing between them.
   Ported from the hero graphic on acugnito.com (three.js r186).
   ========================================================= */
const host = document.querySelector('[data-mobius]');
if (host) {
  // Load three.js only when the graphic is about to scroll into view
  const io = new IntersectionObserver(async ([en]) => {
    if (!en.isIntersecting) return;
    io.disconnect();
    try { init(host, await import('three')); } catch (e) { /* keep the module list fallback */ }
  }, { rootMargin: '600px 0px' });
  io.observe(host);
}

function init(host, THREE) {
  const TAU = Math.PI * 2;
  const SEG = TAU / 6;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tri = (x, c, w) => clamp01(1 - Math.abs(x - c) / w);
  const lerp = (a, b, t) => a + (b - a) * t;

  // Modules in ring order: 1 finance, 2 inventory, 3 people, 4 customer, 5 service, 6 leasing
  const FLOWS = [
    { from: 6, to: 4, doc: 'ticket' },
    { from: 2, to: 1, doc: 'vendor' },
    { from: 5, to: 2, doc: 'parts' },
    { from: 6, to: 1, doc: 'lease' },
  ];
  const docs = JSON.parse(host.dataset.docs || '{}');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const glHost = host.querySelector('.mobius__gl');
  const labels = [null, ...host.querySelectorAll('.mobius__label')];
  const chip = host.querySelector('.mobius__chip');

  // Möbius band: u around the ring, v across the band
  const band = (u, v, out) => {
    const c = Math.cos(u / 2), s = Math.sin(u / 2);
    out.x = (1.72 + v * c) * Math.cos(u);
    out.y = (1.72 + v * c) * Math.sin(u);
    out.z = v * s;
    return out;
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    return; // no WebGL: the module list stays as the fallback
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  glHost.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 7.6);
  camera.lookAt(0, 0, 0);

  /* ---- Warm studio environment ---- */
  {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#fffaf4'); grad.addColorStop(0.55, '#efe6dc'); grad.addColorStop(1, '#cdbfb2');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
    const blob = (x, y, rx, ry, col) => {
      const r = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      r.addColorStop(0, col); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
    };
    blob(256, 30, 200, 40, 'rgba(255,255,255,1)');
    blob(110, 110, 60, 80, 'rgba(255,236,222,0.9)');
    blob(400, 120, 50, 70, 'rgba(230,150,115,0.75)');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(tex);
    tex.dispose(); pm.dispose();
    scene.environment = env.texture;
  }
  const key = new THREE.DirectionalLight(0xfff3ea, 1.5);
  key.position.set(-2.5, 4, 5);
  const rim = new THREE.DirectionalLight(0xffc4a6, 0.8);
  rim.position.set(3.5, -2, -2.5);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.3));

  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  tilt.add(spin);
  scene.add(tilt);

  /* ---- The band ---- */
  const P0 = { x: 0, y: 0, z: 0 }, P1 = { x: 0, y: 0, z: 0 }, P2 = { x: 0, y: 0, z: 0 };
  const US = 520, VS = 30;
  const pos = new Float32Array((US + 1) * (VS + 1) * 3);
  const uv = new Float32Array((US + 1) * (VS + 1) * 2);
  for (let i = 0, p = 0, q = 0; i <= US; i++) {
    const u = (i / US) * TAU;
    for (let j = 0; j <= VS; j++) {
      const v = (j / VS) * 2 - 1;
      band(u, 0.58 * v, P0);
      pos[p++] = P0.x; pos[p++] = P0.y; pos[p++] = P0.z;
      uv[q++] = u; uv[q++] = v;
    }
  }
  const idx = [];
  for (let i = 0; i < US; i++) {
    for (let j = 0; j < VS; j++) {
      const a = (VS + 1) * i + j, b = a + VS + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aBand', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const uniforms = {
    uReveal: { value: reduced ? TAU + 1 : 0 },
    uTime: { value: 0 },
    uHover: { value: 0 },
    uPulseU: { value: 0 },
    uPulse: { value: 0 },
    uLit: { value: [0, 0, 0, 0, 0, 0] },
  };
  const HEAD = `
  uniform float uReveal, uTime, uHover, uPulseU, uPulse;
  uniform float uLit[6];
  varying vec2 vBand;
  const float TAU_ = 6.28318530718;
  vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }
  float hair(float x) {
    float f = fract(x), d = min(f, 1.0 - f), w = fwidth(x);
    return 1.0 - smoothstep(w * 0.6, w * 1.7, d);
  }
  float cdist(float a, float b) { return abs(mod(a - b + 3.14159265, TAU_) - 3.14159265); }
`;
  const COLOR = `
  #include <color_fragment>
  if (vBand.x > uReveal) discard;
  float u = vBand.x, v = vBand.y;
  vec3 inks[6] = vec3[6](
    toLin(vec3(0.800, 0.471, 0.361)),
    toLin(vec3(0.541, 0.314, 0.220)),
    toLin(vec3(0.722, 0.404, 0.294)),
    toLin(vec3(0.639, 0.353, 0.247)),
    toLin(vec3(0.851, 0.545, 0.416)),
    toLin(vec3(0.478, 0.275, 0.196))
  );
  float ks[6] = float[6](12.0, 9.0, 7.0, 15.0, 18.0, 10.0);
  float wsum = 0.0, k = 0.0, lit = 0.0;
  vec3 ink = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float d = cdist(u, float(i) * TAU_ / 6.0);
    float w = exp(-d * d * 8.0);
    wsum += w; ink += inks[i] * w; k += ks[i] * w; lit += uLit[i] * w;
  }
  ink /= wsum; k /= wsum; lit /= wsum;

  float amp = 0.36 * smoothstep(0.0, 0.9, min(u, TAU_ - u));
  float l1 = hair(v * 5.0 + amp * sin(k * u + uTime * 0.45));
  float l2 = hair(v * 5.0 + 0.5 - amp * sin(k * 0.5 * u - uTime * 0.3));
  vec3 paper = mix(toLin(vec3(0.988, 0.968, 0.948)), ink, 0.07);
  vec3 col = mix(paper, ink, clamp(l1 * 0.55 + l2 * 0.28, 0.0, 1.0));
  col = mix(col, ink * 1.08, smoothstep(0.86, 0.95, abs(v)));

  float focus = mix(1.0, smoothstep(0.15, 0.9, lit), uHover);
  col = mix(mix(paper, col, 0.28), col, focus);
  col = mix(col, ink, lit * 0.16);
  diffuseColor.rgb = col;

  float pd = cdist(u, uPulseU);
  vec3 bandGlow = ink * (lit * 0.18 + uPulse * exp(-pd * pd * 22.0) * 0.75);
`;
  const bandMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.5, metalness: 0, side: THREE.DoubleSide,
    sheen: 0.6, sheenColor: new THREE.Color(0xffe2d2), sheenRoughness: 0.5,
    clearcoat: 0.25, clearcoatRoughness: 0.4,
  });
  bandMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = 'attribute vec2 aBand;\nvarying vec2 vBand;\n'
      + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBand = aBand;');
    sh.fragmentShader = HEAD + sh.fragmentShader
      .replace('#include <color_fragment>', COLOR)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += bandGlow;');
  };
  spin.add(new THREE.Mesh(geo, bandMat));

  /* ---- Acugnito mark in the centre ---- */
  const markTex = new THREE.TextureLoader().load(host.dataset.mark);
  markTex.colorSpace = THREE.SRGBColorSpace;
  const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex, transparent: true, depthWrite: false, opacity: 0 }));
  mark.scale.setScalar(0.62);
  tilt.add(mark);

  /* ---- Glow sprite texture ---- */
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  /* ---- Document cards riding the band ---- */
  const cardTex = (() => {
    const c = document.createElement('canvas');
    c.width = 300; c.height = 210;
    const g = c.getContext('2d');
    const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
    g.fillStyle = '#fffdfa'; rr(4, 4, 292, 202, 18); g.fill();
    g.strokeStyle = 'rgba(204,120,92,0.95)'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#cc785c'; rr(26, 26, 120, 24, 12); g.fill();
    g.fillStyle = 'rgba(20,20,19,0.28)';
    [70, 96, 122].forEach((y, i) => { rr(26, y, i === 1 ? 200 : 240, 10, 5); g.fill(); });
    g.fillStyle = 'rgba(204,120,92,0.85)'; rr(186, 162, 84, 16, 8); g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  })();
  const cardGeo = new THREE.PlaneGeometry(0.4, 0.28);
  const makeCard = (size) => {
    const mat = new THREE.MeshStandardMaterial({ map: cardTex, side: THREE.DoubleSide, roughness: 0.55, metalness: 0, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(cardGeo, mat);
    mesh.matrixAutoUpdate = false;
    spin.add(mesh);
    return { mesh, size };
  };
  const riders = [
    { card: makeCard(1), speed: 0.16, offset: 0.4, v: 0.26 },
    { card: makeCard(0.88), speed: 0.12, offset: 2.6, v: -0.3 },
    { card: makeCard(0.95), speed: 0.19, offset: 4.9, v: 0.08 },
    { card: makeCard(0.82), speed: 0.14, offset: 8.3, v: -0.12 },
  ];
  const flowCard = makeCard(1.45);
  const flowGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xcc785c, transparent: true, depthWrite: false, opacity: 0 }));
  flowGlow.scale.setScalar(0.95);
  spin.add(flowGlow);

  const tU = new THREE.Vector3(), tV = new THREE.Vector3(), nrm = new THREE.Vector3(), at = new THREE.Vector3(), scl = new THREE.Vector3();
  const placeOnBand = (card, u, v, lift) => {
    band(u, v, P0); band(u + 0.002, v, P1); band(u, v + 0.002, P2);
    at.set(P0.x, P0.y, P0.z);
    tU.set(P1.x - P0.x, P1.y - P0.y, P1.z - P0.z).normalize();
    tV.set(P2.x - P0.x, P2.y - P0.y, P2.z - P0.z).normalize();
    nrm.crossVectors(tU, tV).normalize();
    tV.crossVectors(nrm, tU).normalize();
    card.mesh.matrix.makeBasis(tU, tV, nrm);
    card.mesh.matrix.scale(scl.set(card.size, card.size, 1));
    card.mesh.matrix.setPosition(at.x + nrm.x * lift, at.y + nrm.y * lift, at.z + nrm.z * lift);
  };

  /* ---- Soft contact shadow ---- */
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(80,40,24,0.28)'); r.addColorStop(0.5, 'rgba(80,40,24,0.10)'); r.addColorStop(1, 'rgba(80,40,24,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.4), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 }));
  shadow.position.set(0, -2.45, -0.6);
  shadow.rotation.x = -1.25;
  scene.add(shadow);

  /* ---- Dust ---- */
  const dust = new Float32Array(420);
  for (let i = 0; i < 140; i++) {
    const r = 2.2 + 1.3 * Math.random(), a = Math.random() * TAU, b = Math.acos(2 * Math.random() - 1);
    dust[3 * i] = r * Math.sin(b) * Math.cos(a);
    dust[3 * i + 1] = r * Math.cos(b) * 0.8;
    dust[3 * i + 2] = r * Math.sin(b) * Math.sin(a);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  const motes = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xcc785c, size: 0.034, map: glowTex, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(motes);

  /* ---- Interaction ---- */
  let W = 1, H = 1;
  let angle = 0.35, velocity = 0, dragging = false, lastX = 0;
  let hovered = -1, pinned = -1;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const tmp = new THREE.Vector3();
  const toScreen = (vec) => { vec.project(camera); return { x: (0.5 * vec.x + 0.5) * W, y: (-0.5 * vec.y + 0.5) * H }; };
  const moduleScreen = (m) => {
    band((m - 1) * SEG, 0, P0);
    tmp.set(P0.x, P0.y, P0.z).applyMatrix4(spin.matrixWorld);
    const z = tmp.z;
    return { ...toScreen(tmp), z };
  };

  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'pan-y';
  const onDown = (e) => { dragging = true; lastX = e.clientX; canvas.style.cursor = 'grabbing'; canvas.setPointerCapture?.(e.pointerId); };
  const onUp = (e) => { dragging = false; canvas.style.cursor = 'grab'; canvas.releasePointerCapture?.(e.pointerId); };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; velocity = 0.006 * dx; angle += velocity; }
    if (pinned > 0) return;
    let best = -1, bestD = 46;
    for (let m = 1; m <= 6; m++) {
      const s = moduleScreen(m);
      const d = Math.hypot(s.x - (e.clientX - r.left), s.y - (e.clientY - r.top));
      if (d < bestD) { bestD = d; best = m; }
    }
    hovered = best;
  };
  const onLeave = () => { mouse.tx = 0; mouse.ty = 0; if (pinned < 0) hovered = -1; };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  labels.forEach((el, m) => {
    if (!el) return;
    el.addEventListener('pointerenter', () => { pinned = m; hovered = m; });
    el.addEventListener('pointerleave', () => { pinned = -1; hovered = -1; });
  });

  /* ---- Frame update ---- */
  let lastT = 0;
  const update = (t) => {
    const dt = Math.min(0.05, Math.max(0, t - lastT));
    lastT = t;
    const time = reduced ? 0 : t;
    const clock = reduced ? 1e6 : t;
    const n = hovered;
    const intro = reduced ? 1 : 1 - Math.pow(1 - clamp01(clock / 2.2), 3);

    mouse.x = lerp(mouse.x, mouse.tx, 0.05);
    mouse.y = lerp(mouse.y, mouse.ty, 0.05);
    tilt.rotation.x = -1.42 + 0.36 * intro + (reduced ? 0 : 0.12 * mouse.y);
    tilt.rotation.y = reduced ? 0 : 0.18 * mouse.x + 0.05 * Math.sin(0.2 * time);
    tilt.rotation.z = 0.22;
    tilt.scale.setScalar(0.9 + 0.1 * intro);
    if (!reduced && !dragging) { velocity *= Math.pow(0.04, dt); angle += velocity + 0.07 * dt; }
    spin.rotation.z = angle;
    uniforms.uTime.value = time;
    if (!reduced) uniforms.uReveal.value = easeInOut(clamp01((clock - 0.15) / 1.9)) * (TAU + 0.02);

    const since = clock - 3;
    let flow = null;
    if (!reduced && since >= 0) {
      const k = Math.floor(since / 4.4);
      flow = { flow: FLOWS[k % FLOWS.length], local: since - 4.4 * k };
    }
    const lit = [0, 0, 0, 0, 0, 0];
    if (n > 0) lit[n - 1] = 1;
    let pulseU = 0, pulse = 0;
    if (flow) {
      const a = (flow.flow.from - 1) * SEG;
      const d = ((((flow.flow.to - 1) * SEG - a + Math.PI) % TAU) + TAU) % TAU - Math.PI;
      pulseU = a + d * easeInOut(clamp01(flow.local / 2.6));
      pulse = clamp01(flow.local / 0.3) * clamp01((2.95 - flow.local) / 0.35);
      lit[flow.flow.from - 1] = Math.max(lit[flow.flow.from - 1], tri(flow.local, 0.25, 0.7));
      lit[flow.flow.to - 1] = Math.max(lit[flow.flow.to - 1], tri(flow.local, 2.85, 0.8));
      uniforms.uPulseU.value = ((pulseU % TAU) + TAU) % TAU;
      uniforms.uPulse.value = pulse;
    } else {
      uniforms.uPulse.value = 0;
    }
    for (let i = 0; i < 6; i++) uniforms.uLit.value[i] = lerp(uniforms.uLit.value[i], lit[i], 0.15);
    uniforms.uHover.value = lerp(uniforms.uHover.value, +(n > 0), 0.12);

    const cardsIn = reduced ? 1 : clamp01((clock - 1.9) / 0.8);
    riders.forEach((r) => {
      const u = (r.offset + time * r.speed) % (2 * TAU);
      placeOnBand(r.card, u, 0.58 * r.v, 0.03);
      r.card.mesh.material.opacity = cardsIn * (n > 0 ? 0.45 : 0.92);
    });
    flowCard.mesh.material.opacity = pulse;
    flowGlow.material.opacity = 0.85 * pulse;
    if (pulse > 0) {
      placeOnBand(flowCard, pulseU, 0, 0.06);
      flowGlow.position.set(at.x + 0.04 * nrm.x, at.y + 0.04 * nrm.y, at.z + 0.04 * nrm.z);
    }

    const fade = reduced ? 1 : clamp01((clock - 0.6) / 1.2);
    mark.material.opacity = 0.95 * fade;
    mark.position.y = reduced ? 0 : 0.04 * Math.sin(0.8 * time);
    shadow.material.opacity = fade;
    motes.material.opacity = 0.5 * fade;
    motes.rotation.y = 0.02 * time;
    tilt.updateMatrixWorld(true);

    // HTML labels follow their module, pushed outward from the centre
    const centre = toScreen(tmp.set(0, 0, 0).applyMatrix4(tilt.matrixWorld));
    for (let m = 1; m <= 6; m++) {
      const el = labels[m];
      if (!el) continue;
      const s = moduleScreen(m);
      const dx = s.x - centre.x, dy = s.y - centre.y, len = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, W / 520);
      const x = s.x + (dx / len) * 54 * k, y = s.y + (dy / len) * 44 * k;
      const shown = reduced ? 1 : clamp01((uniforms.uReveal.value - (m - 1) * SEG) / 0.5);
      const depth = s.z < -0.15 ? 0.55 : 1;
      const dim = n > 0 && n !== m ? 0.35 : depth;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      el.style.opacity = String(shown * dim);
      el.classList.toggle('is-lit', n === m || uniforms.uLit.value[m - 1] > 0.5);
    }
    if (chip) {
      if (flow && pulse > 0.02) {
        const p = toScreen(tmp.setFromMatrixPosition(flowCard.mesh.matrix).applyMatrix4(spin.matrixWorld));
        const text = docs[flow.flow.doc] || '';
        if (chip.dataset.text !== text) { chip.dataset.text = text; chip.lastElementChild.textContent = text; }
        chip.style.transform = `translate3d(${p.x.toFixed(1)}px, ${(p.y - 22).toFixed(1)}px, 0) translate(-50%, -100%)`;
        chip.style.opacity = String(pulse);
      } else {
        chip.style.opacity = '0';
      }
    }
  };

  /* ---- Size, visibility and the render loop ---- */
  const resize = () => {
    const w = glHost.clientWidth, h = glHost.clientHeight;
    if (!w || !h) return;
    W = w; H = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(glHost);

  let t0 = null; // the intro plays the first time the graphic is seen
  let raf = 0, visible = false;
  const frame = () => {
    raf = 0;
    if (!visible) return;
    if (t0 === null) t0 = performance.now();
    update((performance.now() - t0) / 1000);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }, { threshold: 0.05 }).observe(glHost);

  host.classList.add('is-ready');
}
