import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Sparkles, Shield, Cpu, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onEnter: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onEnter }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [showEnterButton, setShowEnterButton] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setAnimationFinished(true);
      setShowEnterButton(true);
      return;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      setAnimationFinished(true);
      setShowEnterButton(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      window.innerWidth / window.innerHeight < 1 ? 55 : 38,
      window.innerWidth / window.innerHeight,
      0.1,
      2500
    );

    // Sky & atmospheric fog
    scene.background = new THREE.Color(0x132a54);
    scene.fog = new THREE.FogExp2(0xd9b79c, 0.0025);

    // Lighting
    scene.add(new THREE.HemisphereLight(0x8faedb, 0x3a3a42, 0.7));
    const sunLight = new THREE.DirectionalLight(0xffb777, 1.8);
    sunLight.position.set(0, 100, -1200);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x9fb8e0, 1.2);
    fillLight.position.set(20, 40, 80);
    scene.add(fillLight);

    // Ground and tracks
    const groundGeo = new THREE.PlaneGeometry(2500, 2500).rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e3540, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(0, -0.6, -500);
    scene.add(ground);

    const trackBed = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 0.45, 1400),
      new THREE.MeshStandardMaterial({ color: 0x5a606d, roughness: 0.9 })
    );
    trackBed.position.set(0, -0.4, -400);
    scene.add(trackBed);

    // High-speed Rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0xa7adb8, metalness: 0.9, roughness: 0.25 });
    [-0.72, 0.72].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1400), railMat);
      rail.position.set(rx, -0.1, -400);
      scene.add(rail);
    });

    // Sleepers (Ties)
    const tieGeo = new THREE.BoxGeometry(2.5, 0.18, 0.28);
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x484c56, roughness: 0.9 });
    const tieCount = 450;
    const ties = new THREE.InstancedMesh(tieGeo, tieMat, tieCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < tieCount; i++) {
      dummy.position.set(0, -0.25, 200 - i * 3.1);
      dummy.updateMatrix();
      ties.setMatrixAt(i, dummy.matrix);
    }
    scene.add(ties);

    // Train Group
    const trainGroup = new THREE.Group();
    scene.add(trainGroup);

    // Locomotive body
    const carMat = new THREE.MeshPhysicalMaterial({
      color: 0x1f4e9e,
      roughness: 0.25,
      metalness: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf1f3f7, roughness: 0.3 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x050c18, roughness: 0.05, metalness: 0.9 });

    const loco = new THREE.Group();
    trainGroup.add(loco);

    const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 3.4, 28), bodyMat);
    body.position.set(0, 2.1, -14);
    loco.add(body);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.6, 6, 24).rotateX(Math.PI / 2), carMat);
    nose.position.set(0, 1.8, 1);
    nose.scale.set(1.0, 0.9, 1.0);
    loco.add(nose);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.8).rotateX(0.3), glassMat);
    windshield.position.set(0, 2.6, 0.2);
    loco.add(windshield);

    // Headlight spots & flares
    [-0.75, 0.75].forEach((hx) => {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshBasicMaterial({ color: 0xfff6e0 }));
      lamp.position.set(hx, 1.35, 3.8);
      loco.add(lamp);

      const spot = new THREE.SpotLight(0xfff0d6, 5.0, 350, 0.28, 0.55);
      spot.position.set(hx, 1.35, 4.0);
      const target = new THREE.Object3D();
      target.position.set(hx * 0.2, 0.2, 180);
      loco.add(target);
      spot.target = target;
      loco.add(spot);
    });

    // Camera initial position
    const CAM_Z = 55;
    camera.position.set(0, 1.6, CAM_Z);
    camera.lookAt(0, 2.1, -250);

    const Z_START = -280;
    const Z_END = CAM_Z + 10;
    const DURATION = 2.4; // 2.4s dynamic approach

    let startTime: number | null = null;
    let animationFrameId: number;

    const handleResize = () => {
      if (!renderer || !canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? 55 : 38;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const progress = Math.min(1, elapsed / DURATION);

      // Smooth acceleration curve
      const eased = Math.pow(progress, 1.35);
      const zCurrent = Z_START + (Z_END - Z_START) * eased;

      trainGroup.position.z = zCurrent;

      // Camera vibration on train passing
      const dist = Math.abs(zCurrent - CAM_Z);
      const shake = Math.exp(-Math.pow(dist / 35, 2)) * 0.04;
      camera.position.x = Math.sin(elapsed * 45) * shake;
      camera.position.y = 1.6 + Math.cos(elapsed * 40) * shake;

      renderer?.render(scene, camera);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Animation finished
        setAnimationFinished(true);
        setTimeout(() => setShowEnterButton(true), 600);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer?.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-[#0F1E36] via-[#162C4E] to-[#0A1220] text-white">
      {/* 3D Train Passing WebGL Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0 pointer-events-none" />

      {/* Atmospheric Vignette & Letterboxing */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-radial-vignette opacity-70" />
      <div className="absolute top-0 left-0 right-0 h-10 bg-black/40 z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/40 z-10" />

      {/* Central RailFlow Title & Welcoming Content */}
      <div
        className={`relative z-20 flex flex-col items-center text-center px-6 transition-all duration-700 ${
          animationFinished ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'
        }`}
      >
        <p className="font-['Barlow_Condensed'] font-semibold text-sm sm:text-base tracking-[0.45em] text-[#F7E9B0] uppercase drop-shadow mb-2">
          Welcome to
        </p>

        <h1 className="font-['Barlow_Condensed'] font-black tracking-wider text-6xl sm:text-8xl md:text-9xl text-white drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)] flex items-center gap-2">
          RAILFLOW
        </h1>

        <div className="h-0.5 w-48 sm:w-80 bg-gradient-to-r from-transparent via-[#F7E9B0] to-transparent my-4 shadow-sm" />

        <p className="font-['Barlow'] font-medium text-sm sm:text-lg text-slate-200 max-w-xl drop-shadow mb-6">
          Railway Disruption & Platform Conflict Simulator
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8 max-w-2xl">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white shadow">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Google OR-Tools CP-SAT</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white shadow">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Independent Safety Validation</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white shadow">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Explainable Replan Audit Trail</span>
          </div>
        </div>

        {/* ENTER COMMAND CENTRE BUTTON */}
        <div
          className={`transition-all duration-500 ${
            showEnterButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button
            onClick={onEnter}
            className="group flex items-center gap-3 px-8 py-3.5 rounded-full bg-[#1F4E9E] hover:bg-[#153e85] text-white font-['Barlow_Condensed'] text-lg font-bold tracking-wider shadow-[0_4px_25px_rgba(31,78,158,0.6)] border border-blue-400/40 hover:scale-105 active:scale-95 transition-all"
          >
            <span>ENTER COMMAND CENTRE</span>
            <ArrowRight className="w-5 h-5 text-cyan-300 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Subtle Skip Button in Top Corner for immediate entry */}
      <button
        onClick={onEnter}
        className="absolute top-4 right-4 z-30 px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/70 text-slate-300 hover:text-white border border-white/20 text-xs font-mono transition-colors"
      >
        Skip intro &rarr;
      </button>
    </div>
  );
};
