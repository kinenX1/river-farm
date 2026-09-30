import * as THREE from 'three';

// Renders 3D models into small transparent images once at startup.
// The hotbar, shop and menu use these instead of flat colour swatches.

let renderer = null;

export function renderIcons(models, { size = 128, angle = [0.5, 0.6], dist = 3.6, target = 0 } = {}) {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
  }
  renderer.setSize(size, size, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a5a, 0.9));
  const key = new THREE.DirectionalLight(0xfff2dd, 1.2); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xaaccff, 0.5); rim.position.set(-4, 2, -3); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(Math.sin(angle[0]) * dist, Math.sin(angle[1]) * dist, Math.cos(angle[0]) * dist);
  camera.lookAt(0, target, 0);

  const out = {};
  for (const [key, make] of Object.entries(models)) {
    const obj = make();
    // centre and fit every model to the same size
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    const pivot = new THREE.Group();
    obj.position.sub(c); pivot.add(obj);
    pivot.scale.setScalar(1.9 / Math.max(s.x, s.y, s.z));
    pivot.position.y = target;
    scene.add(pivot);
    renderer.render(scene, camera);
    out[key] = renderer.domElement.toDataURL('image/png');
    scene.remove(pivot);
  }
  return out;
}
