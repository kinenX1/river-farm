import * as THREE from 'three';

// Life in the world: sky dome with a sun, wind-blown grass, butterflies by
// day, fireflies at night, and dust puffs under walking farmers.

// ---------- sky ----------
export function createSky(scene) {
  const uniforms = {
    top: { value: new THREE.Color(0x3d8fe0) },
    horizon: { value: new THREE.Color(0xbfe6ff) },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    sunColor: { value: new THREE.Color(0xfff2c0) },
    sunSize: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunSize; varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y * 1.6 + 0.1, 0.0, 1.0);
        vec3 col = mix(horizon, top, pow(h, 0.7));
        float d = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        col += sunColor * (pow(d, 900.0 / sunSize) * 3.0 + pow(d, 12.0) * 0.35) * step(-0.05, sunDir.y);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), mat);
  dome.renderOrder = -1;
  scene.add(dome);

  // stars, faded in at night
  const n = 600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.05, Math.random() - 0.5); v.normalize().multiplyScalar(280);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);

  return {
    update(sunPos, skyColor, night) {
      uniforms.sunDir.value.copy(sunPos).normalize();
      uniforms.horizon.value.copy(skyColor).lerp(new THREE.Color(0xffffff), night ? 0 : 0.35);
      uniforms.top.value.copy(skyColor).multiplyScalar(night ? 0.6 : 0.62);
      uniforms.sunColor.value.setHSL(0.1, 0.9, 0.7);
      stars.material.opacity = night;
    },
  };
}

// ---------- grass that bends in the wind ----------
export function createGrass(scene, areas, count = 5000) {
  const blade = new THREE.PlaneGeometry(0.12, 0.7, 1, 3);
  blade.translate(0, 0.35, 0);
  const p = blade.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y / 0.75)); } // taper
  const uniforms = { time: { value: 0 }, wind: { value: 1 } };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9 });
  mat.onBeforeCompile = shader => {
    shader.uniforms.time = uniforms.time; shader.uniforms.wind = uniforms.wind;
    shader.vertexShader = 'uniform float time; uniform float wind; varying float vH;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vH = position.y / 0.7;
      vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float sway = sin(time * 1.8 + wp.x * 0.35 + wp.z * 0.25) * 0.5 + sin(time * 3.1 + wp.x) * 0.15;
      transformed.x += sway * wind * 0.22 * position.y * position.y * 2.5;
      transformed.z += sway * wind * 0.08 * position.y;`);
    shader.fragmentShader = 'varying float vH;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      diffuseColor.rgb *= mix(0.55, 1.15, vH);`);
  };
  const mesh = new THREE.InstancedMesh(blade, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = areas[i % areas.length];
    pos.set(a.x + (Math.random() - 0.5) * a.w, 0.44, a.z + (Math.random() - 0.5) * a.d);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI);
    const k = 0.6 + Math.random() * 0.8; s.set(k, k * (0.7 + Math.random() * 0.6), k);
    m.compose(pos, q, s); mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, color.setHSL(0.27 + Math.random() * 0.04, 0.55, 0.35 + Math.random() * 0.15));
  }
  mesh.receiveShadow = true;
  scene.add(mesh);
  return { update(t, windy) { uniforms.time.value = t; uniforms.wind.value = windy; } };
}

// ---------- butterflies (day) and fireflies (night) ----------
export function createCritters(scene, areas) {
  const flies = [];
  const wingGeo = new THREE.PlaneGeometry(0.28, 0.2); wingGeo.translate(0.14, 0, 0);
  const colors = [0xffd84a, 0xffffff, 0xff9ad0, 0x8fd3ff];
  for (let i = 0; i < 14; i++) {
    const a = areas[i % areas.length];
    const g = new THREE.Group();
    const wm = new THREE.MeshStandardMaterial({ color: colors[i % 4], side: THREE.DoubleSide, roughness: 0.6 });
    const l = new THREE.Mesh(wingGeo, wm), r = new THREE.Mesh(wingGeo, wm); r.scale.x = -1;
    g.add(l, r);
    g.userData = { l, r, home: new THREE.Vector3(a.x + (Math.random() - 0.5) * a.w * 0.8, 0, a.z + (Math.random() - 0.5) * a.d * 0.8), phase: Math.random() * 10 };
    scene.add(g); flies.push(g);
  }
  const n = 60, pos = new Float32Array(n * 3), seeds = [];
  for (let i = 0; i < n; i++) { const a = areas[i % areas.length]; seeds.push([a.x + (Math.random() - 0.5) * a.w, a.z + (Math.random() - 0.5) * a.d, Math.random() * 10]); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const fireflies = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xfff27a, size: 0.35, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(fireflies);

  return {
    update(t, night) {
      for (const g of flies) {
        const u = g.userData, k = t * 0.5 + u.phase;
        g.visible = night < 0.5;
        g.position.set(u.home.x + Math.sin(k) * 3, 1.2 + Math.sin(k * 3.1) * 0.5, u.home.z + Math.cos(k * 0.8) * 3);
        g.rotation.y = -k;
        const flap = Math.sin(t * 22 + u.phase) * 1.1;
        u.l.rotation.y = flap; u.r.rotation.y = -flap;
      }
      fireflies.material.opacity = night * (0.7 + Math.sin(t * 5) * 0.3);
      if (night > 0) {
        seeds.forEach(([x, z, p], i) => pos.set([x + Math.sin(t * 0.4 + p) * 1.5, 0.9 + Math.sin(t * 0.9 + p) * 0.6, z + Math.cos(t * 0.3 + p) * 1.5], i * 3));
        fg.attributes.position.needsUpdate = true;
      }
    },
  };
}

// ---------- dust puffs under feet ----------
export function createDust(scene) {
  const puffs = [];
  const geo = new THREE.SphereGeometry(0.22, 8, 6);
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xd9c9a3, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; scene.add(m); puffs.push({ m, life: 0 });
  }
  let next = 0;
  return {
    puff(x, z) {
      const p = puffs[next++ % puffs.length];
      p.life = 1; p.m.visible = true;
      p.m.position.set(x + (Math.random() - 0.5) * 0.5, 0.6, z + (Math.random() - 0.5) * 0.5);
    },
    update(dt) {
      for (const p of puffs) {
        if (p.life <= 0) continue;
        p.life -= dt * 1.6;
        p.m.position.y += dt * 0.6;
        p.m.scale.setScalar(1 + (1 - p.life) * 1.8);
        p.m.material.opacity = Math.max(0, p.life) * 0.45;
        if (p.life <= 0) p.m.visible = false;
      }
    },
  };
}
