import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Eye, Maximize2, Minimize2, Pause, Play, Compass } from 'lucide-react';

interface Railway3DBackgroundProps {
  theme: 'light' | 'dark';
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const Railway3DBackground: React.FC<Railway3DBackgroundProps> = ({
  theme,
  isExpanded = false,
  onToggleExpand,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [cameraMode, setCameraMode] = useState<'3d' | 'top' | 'follow'>('3d');
  const [isPaused, setIsPaused] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [opacity, setOpacity] = useState(isExpanded ? 1.0 : 0.85);

  const stateRef = useRef({
    cameraMode: '3d',
    isPaused: false,
    simSpeed: 1,
    theme: theme,
    setMode: (_m: '3d' | 'top' | 'follow') => {},
  });

  stateRef.current.cameraMode = cameraMode;
  stateRef.current.isPaused = isPaused;
  stateRef.current.simSpeed = simSpeed;
  stateRef.current.theme = theme;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Three.js setup
    const TL = 300; // Loop length
    const SCALE = 4; // 1 unit = 4m
    const TZ = [-4.5, 0, 4.5]; // 3 track center lines
    const DIRS = [1, -1, 1]; // Track 1, 3 eastbound, Track 2 westbound
    const GAUGE = 1.435, BT = 0.14, SL = 0.15, BODY_Y = 0.66;
    const mod = (a: number, n: number) => ((a % n) + n) % n;

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const persp = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 400);
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    let camera: THREE.Camera = persp;

    // Materials
    const M = (c: number, r = 0.6, m = 0.1) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const steel = M(0x2a3340, 0.6, 0.6);
    const dark = M(0x141a24, 0.7, 0.5);
    const railMat = M(0x8892a2, 0.4, 0.8);
    const sleeperMat = M(0x6b5a4a, 0.95, 0);
    const ballastMat = M(0x7d8a9e, 1, 0);
    const groundMat = M(0x9aa6b4, 1, 0);
    const platMat = M(0xc9d1dc, 0.9, 0);
    const yellowMat = M(0xf2c230, 0.6, 0.1);
    const poleMat = M(0x4a586e, 0.8, 0.2);
    const roofMat = M(0xaeb8c8, 0.6, 0.3);
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x10192b, roughness: 0.2, metalness: 0.6, emissive: 0xffd27a, emissiveIntensity: 0 });
    const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffe3a0, emissiveIntensity: 0 });
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });

    const Box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
    const addMesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, noShadow = false) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      if (!noShadow) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      parent.add(mesh);
      return mesh;
    };

    // Lights
    const hemi = new THREE.HemisphereLight(0xeaf2ff, 0x6a7788, 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff3dc, 0.95);
    sun.position.set(30, 60, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    // Apply color theme
    const applyColors = (isNight: boolean) => {
      const bg = isNight ? 0x0a1b3a : 0xbfd3ea;
      scene.background = new THREE.Color(bg);
      scene.fog = new THREE.Fog(bg, 70, 190);
      groundMat.color.set(isNight ? 0x1b2638 : 0x9aa6b4);
      ballastMat.color.set(isNight ? 0x34445f : 0x7d8a9e);
      platMat.color.set(isNight ? 0x6e7b90 : 0xc9d1dc);
      hemi.intensity = isNight ? 0.55 : 0.9;
      sun.intensity = isNight ? 0.6 : 0.95;
      windowMat.emissiveIntensity = isNight ? 0.9 : 0.0;
      lampHeadMat.emissiveIntensity = isNight ? 1.2 : 0.0;
    };
    applyColors(stateRef.current.theme === 'dark');

    // Textures: Station Signboard
    const makeStationSignTex = () => {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 128;
      const x = c.getContext('2d')!;
      x.fillStyle = 'rgba(19,48,92,0.9)';
      x.fillRect(0, 0, 1024, 128);
      x.fillStyle = '#FFFFFF';
      x.font = '700 70px "Barlow Condensed", sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('RAILFLOW CENTRAL JUNCTION', 512, 64);
      const t = new THREE.CanvasTexture(c);
      t.needsUpdate = true;
      return t;
    };

    // Ground & Tracks
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800).rotateX(-Math.PI / 2), groundMat);
    ground.receiveShadow = true;
    scene.add(ground);

    const TRACK_LEN = 360, sleeperCount = 360;
    const sleepers = new THREE.InstancedMesh(Box(0.26, SL, 2.6), sleeperMat, sleeperCount * 3);
    const dummy = new THREE.Object3D();

    TZ.forEach((z, t) => {
      addMesh(scene, Box(TRACK_LEN, BT, 3.4), ballastMat, 0, BT / 2, z, true).receiveShadow = true;
      [-1, 1].forEach((sz) => {
        const zz = z + (sz * GAUGE) / 2;
        addMesh(scene, Box(TRACK_LEN, 0.03, 0.14), railMat, 0, 0.305, zz, true);
        addMesh(scene, Box(TRACK_LEN, 0.12, 0.05), railMat, 0, 0.35, zz, true);
        addMesh(scene, Box(TRACK_LEN, 0.05, 0.1), railMat, 0, 0.435, zz, true);
      });
      for (let k = 0; k < sleeperCount; k++) {
        dummy.position.set(-TRACK_LEN / 2 + 0.5 + k * (TRACK_LEN / sleeperCount), BT + SL / 2, z);
        dummy.updateMatrix();
        sleepers.setMatrixAt(t * sleeperCount + k, dummy.matrix);
      }
    });
    sleepers.receiveShadow = true;
    scene.add(sleepers);

    // Platforms
    const platTex = makeStationSignTex();
    [-2.25, 2.25].forEach((zc) => {
      addMesh(scene, Box(38, 1.0, 2.4), platMat, 0, 0.5, zc);
      addMesh(scene, Box(38, 0.02, 0.22), yellowMat, 0, 1.005, zc - 1.04, true);
      addMesh(scene, Box(38, 0.02, 0.22), yellowMat, 0, 1.005, zc + 1.04, true);
      const nm = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 2.0).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: platTex, transparent: true })
      );
      nm.position.set(0, 1.03, zc);
      scene.add(nm);
      [-12, -4, 4, 12].forEach((x) => {
        addMesh(scene, new THREE.CylinderGeometry(0.06, 0.06, 3, 8), poleMat, x, 2.5, zc);
        addMesh(scene, Box(0.6, 0.12, 0.3), lampHeadMat, x, 4.05, zc, true);
      });
    });

    // Concourse Building
    addMesh(scene, Box(36, 1.0, 1.0), platMat, 0, 0.5, -8.0, true);
    addMesh(scene, Box(32, 3.5, 3.2), M(0xd8cfb6, 0.85, 0), 0, 1.75, -9.6);
    addMesh(scene, Box(34, 0.4, 3.6), M(0x1f4e9e, 0.6, 0.2), 0, 3.6, -9.6);

    // Train builder functions
    const passengerCar = (o: any) => {
      const len = o.len, w = o.w, h = o.h, nose = o.nose || 0;
      const car = new THREE.Group(), inner = new THREE.Group();
      car.add(inner);
      const bodyMat = M(o.body, 0.5, 0.25), bandMat = M(o.band, 0.55, 0.25), stripeMat = M(o.stripe, 0.6, 0.2);
      let g;
      if (nose > 0) {
        const sh = new THREE.Shape();
        sh.moveTo(-len / 2, 0);
        sh.lineTo(len / 2, 0);
        sh.lineTo(len / 2, h * 0.36);
        sh.lineTo(len / 2 - nose, h);
        sh.lineTo(-len / 2, h);
        sh.lineTo(-len / 2, 0);
        g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false });
        g.translate(0, 0, -w / 2);
      } else {
        g = Box(len, h, w);
        g.translate(0, h / 2, 0);
      }
      addMesh(inner, g, bodyMat, 0, 0, 0);
      addMesh(inner, Box(len + 0.02, h * 0.26, w + 0.02), bandMat, 0, h * 0.13, 0);
      addMesh(inner, Box(len + 0.03, 0.12, w + 0.03), stripeMat, 0, h * 0.26 + 0.06, 0, true);
      const winL = len - 1.2 - nose * 0.6, shift = nose ? -nose * 0.3 : 0;
      addMesh(inner, Box(winL, h * 0.2, w + 0.05), windowMat, shift, h * 0.62, 0, true);
      addMesh(inner, Box(len - 1, 0.12, w * 0.55), roofMat, shift, h + 0.06, 0);
      [-0.3, 0.3].forEach((f) => {
        addMesh(inner, Box(1.8, 0.4, w * 0.72), dark, f * len, -0.25, 0);
      });
      if (nose > 0) {
        [-1, 1].forEach((sz) => {
          addMesh(inner, Box(0.08, 0.2, 0.3), o.tail ? tailMat : headMat, len / 2 + 0.02, h * 0.2, sz * w * 0.3, true);
        });
        if (o.tail) inner.rotation.y = Math.PI;
      }
      if (o.pantograph) {
        addMesh(inner, Box(0.5, 0.12, 1.2), dark, 0, h + 0.18, 0, true);
        const arm = addMesh(inner, Box(0.06, 1.2, 0.06), steel, 0.25, h + 0.75, 0, true);
        arm.rotation.z = -0.5;
        addMesh(inner, Box(0.12, 0.06, 1.7), dark, 0.5, h + 1.3, 0, true);
      }
      return car;
    };

    const loco = (len: number) => {
      const car = new THREE.Group(), w = 2.6;
      const red = M(0x9e2b25, 0.5, 0.3);
      addMesh(car, Box(len, 2.4, w), red, 0, 1.2, 0);
      addMesh(car, Box(2.8, 3.3, w), red, len / 2 - 1.4, 1.65, 0);
      addMesh(car, Box(0.05, 1.0, w * 0.8), M(0x0c1424, 0.15, 0.7), len / 2 + 0.01, 2.5, 0, true);
      addMesh(car, Box(len + 0.02, 0.5, w + 0.02), yellowMat, 0, 0.3, 0, true);
      addMesh(car, Box(len - 3.2, 0.12, w * 0.6), roofMat, -1.5, 2.46, 0);
      [-1, 1].forEach((sz) => {
        addMesh(car, Box(0.08, 0.2, 0.3), headMat, len / 2 + 0.02, 1.0, sz * w * 0.3, true);
      });
      [-0.3, 0.3].forEach((f) => {
        addMesh(car, Box(2.0, 0.4, w * 0.72), dark, f * len, -0.25, 0);
      });
      return car;
    };

    const wagon = (len: number, col: number) => {
      const car = new THREE.Group(), w = 2.5;
      addMesh(car, Box(len, 0.3, w), M(0x2b3340, 0.7, 0.4), 0, 0.15, 0);
      addMesh(car, Box(len - 0.4, 2.4, w - 0.1), M(col, 0.6, 0.25), 0, 1.5, 0);
      [-0.3, 0.3].forEach((f) => {
        addMesh(car, Box(1.8, 0.4, w * 0.72), dark, f * len, -0.25, 0);
      });
      return car;
    };

    // Train instances
    const KINDS = {
      express: { label: 'Vande Bharat / Express', color: 0x1f4e9e, vmax: 9, stops: false },
      local: { label: 'Local / Shatabdi', color: 0xf2a93b, vmax: 5.5, stops: true },
      freight: { label: 'Container Freight', color: 0xc9352b, vmax: 4.0, stops: false },
    };

    const trainList: any[] = [];
    const containerColors = [0x1f4e9e, 0xc9352b, 0x2e8b57, 0xe08a1e, 0x6b4fa0];

    const createTrain = (name: string, kind: 'express' | 'local' | 'freight', track: number, s0: number) => {
      const K = KINDS[kind];
      const cars: any[] = [];
      let cum = 0;
      const gap = 0.25;
      const parts: any[] = [];

      if (kind === 'express') {
        for (let i = 0; i < 6; i++) {
          parts.push(
            passengerCar({
              len: 6.2,
              w: 2.5,
              h: 2.8,
              nose: i === 0 || i === 5 ? 2.6 : 0,
              tail: i === 5,
              body: 0xf4f6fa,
              band: 0x1f4e9e,
              stripe: 0xf2a93b,
              pantograph: i === 2,
            })
          );
        }
      } else if (kind === 'local') {
        for (let i = 0; i < 4; i++) {
          parts.push(
            passengerCar({
              len: 6,
              w: 2.5,
              h: 2.7,
              nose: i === 0 || i === 3 ? 1.4 : 0,
              tail: i === 3,
              body: 0xede6cf,
              band: 0x2b7a78,
              stripe: 0xf2a93b,
            })
          );
        }
      } else {
        parts.push({ obj: loco(7), len: 7 });
        for (let i = 0; i < 6; i++) {
          parts.push({ obj: wagon(6.2, containerColors[i % containerColors.length]), len: 6.2 });
        }
      }

      parts.forEach((p) => {
        const obj = p.obj || p;
        const ln = p.len || 6.2;
        cars.push({ obj, off: cum + ln / 2 });
        cum += ln + gap;
        scene.add(obj);
      });

      const len = cum - gap;
      const T = {
        name,
        kind,
        K,
        track,
        dir: DIRS[track],
        cars,
        len,
        s: s0,
        v: K.vmax,
        state: 'running',
        sStop: TL / 2 + len / 2,
        served: !K.stops || s0 > TL / 2 + len / 2,
        timer: 0,
      };
      trainList.push(T);
    };

    createTrain('RF 22418', 'local', 0, 60);
    createTrain('RF 22420', 'local', 0, 215);
    createTrain('RF 12301', 'express', 1, 110);
    createTrain('RF 12302', 'express', 1, 260);
    createTrain('RF 60517', 'freight', 2, 140);
    createTrain('RF 60522', 'freight', 2, 290);

    // Simulation logic
    const ACC = 0.9, DEC = 1.1, MIN_GAP = 4, DWELL = 6;
    const simulatePhysics = (dt: number) => {
      trainList.forEach((T, i) => {
        let vT = T.K.vmax;
        let gapMin = 1e9;
        for (let j = 0; j < trainList.length; j++) {
          if (j === i || trainList[j].track !== T.track) continue;
          const g = mod(trainList[j].s - trainList[j].len - T.s, TL);
          if (g < gapMin) gapMin = g;
        }
        if (gapMin < 1e8) {
          const vSafe = Math.sqrt(2 * DEC * 0.9 * Math.max(gapMin - MIN_GAP, 0));
          if (vSafe < vT) vT = vSafe;
        }

        if (T.K.stops && !T.served) {
          if (T.s > T.sStop + 0.5) {
            T.served = true;
          } else {
            const d = T.sStop - T.s;
            const vSt = Math.max(0.35, Math.sqrt(2 * DEC * 0.85 * Math.max(d, 0)));
            if (vSt < vT) vT = vSt;
          }
        }

        if (T.state === 'dwell') {
          T.v = 0;
          T.timer -= dt;
          if (T.timer <= 0) {
            T.state = 'running';
            T.served = true;
          }
          return;
        }

        if (T.v < vT) T.v = Math.min(vT, T.v + ACC * dt);
        else T.v = Math.max(vT, T.v - DEC * 1.3 * dt);

        T.s += T.v * dt;
        if (T.s >= TL) {
          T.s -= TL;
          if (T.K.stops) T.served = false;
        }
        if (T.K.stops && !T.served && T.sStop - T.s < 0.35 && T.v < 0.5) {
          T.s = T.sStop;
          T.v = 0;
          T.state = 'dwell';
          T.timer = DWELL;
        }
      });
    };

    const placeTrains = () => {
      trainList.forEach((T) => {
        const z = TZ[T.track];
        T.cars.forEach((c: any) => {
          const sc = mod(T.s - c.off, TL);
          const x = T.dir > 0 ? sc - TL / 2 : TL / 2 - sc;
          c.obj.position.set(x, BODY_Y, z);
          c.obj.rotation.y = T.dir > 0 ? 0 : Math.PI;
        });
      });
    };

    // Camera modes
    const tgt = new THREE.Vector3(0, 1.5, 0);
    const followPos = new THREE.Vector3();
    const cur = { th: 0.9, ph: 1.0, r: 58 };
    const want = { th: 0.9, ph: 1.0, r: 58 };
    const top = { x: 0, z: 0, half: 38 };

    const updateCameraMode = (m: '3d' | 'top' | 'follow') => {
      camera = m === 'top' ? ortho : persp;
      if (m === 'top') {
        top.x = 0;
        top.z = 0;
        top.half = container.clientWidth / container.clientHeight < 1 ? 28 : 38;
      }
      if (m === '3d') {
        tgt.set(0, 1.5, 0);
        want.th = 0.9;
        want.ph = 1.0;
        want.r = 58;
      }
      if (m === 'follow') {
        const T = trainList[2]; // Follow express
        const sc = mod(T.s - T.len / 2, TL);
        followPos.set(T.dir > 0 ? sc - TL / 2 : TL / 2 - sc, 1.8, TZ[T.track]);
        tgt.copy(followPos);
        want.th = T.dir > 0 ? -1.15 : 1.15;
        want.ph = 1.2;
        want.r = 26;
        cur.th = want.th;
        cur.ph = want.ph;
        cur.r = want.r;
      }
    };
    stateRef.current.setMode = updateCameraMode;

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth, h = container.clientHeight, a = w / h;
      renderer.setSize(w, h, false);
      persp.aspect = a;
      persp.updateProjectionMatrix();
      const hw = top.half, hh = hw / a;
      ortho.left = -hw;
      ortho.right = hw;
      ortho.top = hh;
      ortho.bottom = -hh;
      ortho.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // Mouse / touch interaction
    let dragging = false;
    let prevX = 0, prevY = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;

      if (stateRef.current.cameraMode === 'top') {
        const wpp = (2 * top.half) / container.clientWidth;
        top.x = Math.max(-120, Math.min(120, top.x - dx * wpp));
        top.z = Math.max(-30, Math.min(30, top.z - dy * wpp));
      } else {
        want.th -= dx * 0.006;
        want.ph = Math.max(0.2, Math.min(1.5, want.ph - dy * 0.006));
      }
    };
    const onPointerUp = () => {
      dragging = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Animation Loop
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const isNight = stateRef.current.theme === 'dark';
      applyColors(isNight);

      if (!stateRef.current.isPaused) {
        simulatePhysics(dt * stateRef.current.simSpeed);
      }
      placeTrains();

      const kc = 1 - Math.pow(0.001, dt);
      if (stateRef.current.cameraMode === 'top') {
        camera.position.set(top.x, 120, top.z);
        camera.up.set(0, 0, -1);
        camera.lookAt(top.x, 0, top.z);
      } else {
        // Slow ambient orbit in 3D
        if (!dragging && stateRef.current.cameraMode === '3d') {
          want.th += dt * 0.04;
        }
        if (stateRef.current.cameraMode === 'follow') {
          const T = trainList[2];
          const sc = mod(T.s - T.len / 2, TL);
          followPos.set(T.dir > 0 ? sc - TL / 2 : TL / 2 - sc, 1.8, TZ[T.track]);
          tgt.copy(followPos);
        }
        cur.th += (want.th - cur.th) * kc;
        cur.ph += (want.ph - cur.ph) * kc;
        cur.r += (want.r - cur.r) * kc;
        camera.up.set(0, 1, 0);
        camera.position.set(
          tgt.x + cur.r * Math.sin(cur.ph) * Math.sin(cur.th),
          tgt.y + cur.r * Math.cos(cur.ph),
          tgt.z + cur.r * Math.sin(cur.ph) * Math.cos(cur.th)
        );
        camera.lookAt(tgt);
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    updateCameraMode('3d');
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleModeChange = (mode: '3d' | 'top' | 'follow') => {
    setCameraMode(mode);
    stateRef.current.setMode(mode);
  };

  return (
    <div
      className={`fixed inset-0 transition-opacity duration-300 ${
        isExpanded ? 'z-50 pointer-events-auto bg-[#0B132B]' : 'z-0 pointer-events-none'
      }`}
      style={{ opacity: isExpanded ? 1.0 : 0.22 }}
    >
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 3D Simulation Controls Floating Toolbar - visible when expanded */}
      {isExpanded && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#0F172A]/95 text-white px-4 py-2 rounded-full border border-slate-700 shadow-2xl text-xs font-sans">
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-full">
            <button
              onClick={() => handleModeChange('top')}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                cameraMode === 'top' ? 'bg-[#2563EB] text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              Top View
            </button>
            <button
              onClick={() => handleModeChange('3d')}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                cameraMode === '3d' ? 'bg-[#2563EB] text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              3D View
            </button>
            <button
              onClick={() => handleModeChange('follow')}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                cameraMode === 'follow' ? 'bg-[#2563EB] text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              Follow Train
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={() => {
              const nextSpeed = simSpeed === 1 ? 2 : simSpeed === 2 ? 4 : 1;
              setSimSpeed(nextSpeed);
            }}
            className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 font-mono font-bold hover:bg-slate-700"
          >
            {simSpeed}x
          </button>

          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              title="Return to Command Centre"
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#2563EB] text-white hover:bg-[#1D4ED8] font-bold"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Exit 3D View</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
