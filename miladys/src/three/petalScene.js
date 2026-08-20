import * as THREE from 'three';
import gsap from 'gsap';
import { createNoise3D } from 'simplex-noise';
import { createPetalGeometry } from './petalGeometry';

const PALETTE = ['#9c2c3d', '#b23a4d', '#e8c4b7', '#f1ddd2', '#c9707c'];

function mulberry32(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function createPetalScene(container, opts = {}) {
  const {
    reducedMotion = false,
    onFormed = () => {},
  } = opts;

  const rand = mulberry32(20260813);
  const noise3D = createNoise3D(() => rand());

  const width = container.clientWidth;
  const height = container.clientHeight;
  const isMobile = width < 700;
  const isTablet = !isMobile && width < 1100;
  const count = isMobile ? 110 : isTablet ? 220 : 340;

  // ---------- renderer / scene / camera ----------
  const renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(0, 0.1, isMobile ? 7.4 : 6.2);
  camera.lookAt(0, 0, 0);

  // ---------- lighting ----------
  const key = new THREE.DirectionalLight(0xfff3ea, 4.8);
  key.position.set(3, 4, 5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xe8c4b7, 2.4);
  rim.position.set(-4, 1.5, -3);
  scene.add(rim);

  const fill = new THREE.HemisphereLight(0xfff8f2, 0x3a1218, 1.5);
  scene.add(fill);

  // ---------- petals: one InstancedMesh per palette color ----------
  // (avoids any per-instance vertexColors/instanceColor plumbing entirely —
  // a handful of plain colored meshes is simpler and renders reliably everywhere)
  const geometry = createPetalGeometry();
  const groupCount = PALETTE.length;
  const perGroupCapacity = Math.ceil(count / groupCount) + 1;

  const meshes = PALETTE.map((hex) => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      roughness: 0.5,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const m = new THREE.InstancedMesh(geometry, mat, perGroupCapacity);
    m.count = 0;
    scene.add(m);
    return m;
  });
  const groupCursors = new Array(groupCount).fill(0);

  const dummy = new THREE.Object3D();
  const scratchPos = new THREE.Vector3();
  const bloomRadius = isMobile ? 1.35 : 1.7;

  const petals = [];
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    // --- target: fibonacci-sphere sampling, squashed toward camera for a bloom-like cluster
    const yNorm = 1 - (i / Math.max(1, count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - yNorm * yNorm));
    const theta = golden * i;
    const tx = Math.cos(theta) * radiusAtY;
    let tz = Math.sin(theta) * radiusAtY;
    tz = tz * 0.5 + 0.32;
    const ty = yNorm * 0.9;

    const target = new THREE.Vector3(tx, ty, tz).multiplyScalar(bloomRadius);
    const dir = target.clone().normalize();
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const twist = new THREE.Quaternion().setFromAxisAngle(dir, (rand() - 0.5) * 0.9);
    targetQuat.premultiply(twist);

    // outer petals (larger radiusAtY progress) read larger/more open; inner ones smaller/tighter
    const opennessT = i / Math.max(1, count - 1);
    const baseScale = (0.55 + opennessT * 0.75) * (0.85 + rand() * 0.3);

    // --- scatter start: biased into 6 zones (left/right/top/bottom/fore/back)
    const zone = i % 6;
    const zoneAngle = [Math.PI, 0, Math.PI / 2, -Math.PI / 2, 0, Math.PI][zone] + (rand() - 0.5) * 1.1;
    const scatterDist = 3.4 + rand() * 3.2;
    const sx = Math.cos(zoneAngle) * scatterDist * (zone === 4 ? 0.3 : 1);
    const sy = Math.sin(zoneAngle) * scatterDist * 0.7 + (rand() - 0.5) * 1.5;
    const sz = zone === 4 ? 2.6 + rand() * 1.6 : zone === 5 ? -3.2 - rand() * 1.6 : (rand() - 0.5) * 3;
    const start = new THREE.Vector3(sx, sy, sz);

    const startQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2)
    );

    // curved-flight control point: offset from the straight midpoint
    const mid = start.clone().lerp(target, 0.5);
    const perp = new THREE.Vector3(-dir.y, dir.x, dir.z * 0.6).normalize();
    mid.addScaledVector(perp, (rand() - 0.5) * 2.6);
    mid.y += (rand() - 0.5) * 1.4;

    const groupIdx = i % groupCount;
    const localIndex = groupCursors[groupIdx]++;

    const state = { t: 0 };
    petals.push({
      state, start, mid, target, startQuat, targetQuat, baseScale,
      groupIdx, localIndex,
      seed: rand() * 1000,
      noiseFreq: 0.35 + rand() * 0.25,
    });
  }

  meshes.forEach((m, idx) => { m.count = groupCursors[idx]; });

  // ---------- timeline ----------
  const tl = gsap.timeline({
    delay: reducedMotion ? 0 : 0.15,
    onComplete: onFormed,
  });

  if (reducedMotion) {
    petals.forEach((p) => { p.state.t = 1; });
  } else {
    petals.forEach((p, i) => {
      const delay = (i / count) * 2.6 + rand() * 0.35;
      const duration = 1.7 + rand() * 0.9;
      tl.to(p.state, { t: 1, duration, ease: 'back.out(1.25)' }, delay);
    });
  }

  const totalDuration = reducedMotion ? 0 : tl.duration();

  // camera slow forward dolly across the formation
  if (!reducedMotion) {
    gsap.to(camera.position, {
      z: isMobile ? 6.4 : 5.35,
      duration: totalDuration + 0.6,
      ease: 'power1.inOut',
    });
  } else {
    camera.position.z = isMobile ? 6.4 : 5.35;
  }

  // ---------- mouse parallax ----------
  const mouseTarget = { x: 0, y: 0 };
  const mouseCurrent = { x: 0, y: 0 };
  function setMouse(nx, ny) {
    mouseTarget.x = nx;
    mouseTarget.y = ny;
  }

  // ---------- scroll ----------
  let scrollProgress = 0;
  function setScrollProgress(p) {
    scrollProgress = p;
  }

  // ---------- render loop ----------
  const clock = new THREE.Clock();
  let rafId;
  function tick() {
    const elapsed = clock.getElapsedTime();

    mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.04;
    mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.04;

    camera.position.x = mouseCurrent.x * 0.35 - scrollProgress * 0.1;
    camera.position.y = 0.1 + mouseCurrent.y * -0.2;
    camera.lookAt(0, 0, 0);

    for (let mi = 0; mi < meshes.length; mi++) {
      meshes[mi].rotation.y = scrollProgress * 0.5;
      meshes[mi].position.z = -scrollProgress * 0.6;
    }

    for (let i = 0; i < count; i++) {
      const p = petals[i];
      const t = p.state.t;
      const t01 = t < 0 ? 0 : t > 1 ? 1 : t;

      // quadratic bezier flight path (extrapolates naturally past t=1 for overshoot)
      const inv = 1 - t;
      const w0 = inv * inv;
      const w1 = 2 * inv * t;
      const w2 = t * t;
      scratchPos.set(
        p.start.x * w0 + p.mid.x * w1 + p.target.x * w2,
        p.start.y * w0 + p.mid.y * w1 + p.target.y * w2,
        p.start.z * w0 + p.mid.z * w1 + p.target.z * w2
      );

      // turbulence fades out as the petal arrives; small ambient life continues after
      const settle = 1 - smoothstep(0.55, 1, t01);
      const nT = elapsed * p.noiseFreq + p.seed;
      const idle = t01 >= 0.98 ? 0.028 : 0;
      scratchPos.x += noise3D(nT, p.seed, 0) * (0.55 * settle + idle);
      scratchPos.y += noise3D(p.seed, nT, 0) * (0.55 * settle + idle);
      scratchPos.z += noise3D(0, nT, p.seed) * (0.35 * settle + idle);

      dummy.position.copy(scratchPos);
      dummy.quaternion.copy(p.startQuat).slerp(p.targetQuat, smoothstep(0, 0.9, t01));

      const growIn = smoothstep(0, 0.12, t01);
      dummy.scale.setScalar(p.baseScale * growIn);

      dummy.updateMatrix();
      meshes[p.groupIdx].setMatrixAt(p.localIndex, dummy.matrix);
    }
    for (let mi = 0; mi < meshes.length; mi++) {
      meshes[mi].instanceMatrix.needsUpdate = true;
    }

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }
  tick();

  // ---------- resize ----------
  function handleResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', handleResize);

  function dispose() {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', handleResize);
    tl.kill();
    gsap.killTweensOf(camera.position);
    geometry.dispose();
    meshes.forEach((m) => m.material.dispose());
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  }

  return { dispose, setMouse, setScrollProgress, isSupported: true };
}

export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}
