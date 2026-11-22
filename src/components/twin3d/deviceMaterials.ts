import * as THREE from 'three';

export interface DeviceMaterialLibrary {
  titaniumFrame: THREE.MeshPhysicalMaterial;
  aluminumChassis: THREE.MeshPhysicalMaterial;
  darkChassis: THREE.MeshPhysicalMaterial;
  oledGlass: THREE.MeshPhysicalMaterial;
  oledScreen: THREE.MeshStandardMaterial;
  pcbBoard: THREE.MeshStandardMaterial;
  siliconDie: THREE.MeshPhysicalMaterial;
  memoryPackage: THREE.MeshStandardMaterial;
  copperThermal: THREE.MeshPhysicalMaterial;
  batteryPack: THREE.MeshStandardMaterial;
  cameraLens: THREE.MeshPhysicalMaterial;
  cameraRing: THREE.MeshPhysicalMaterial;
  keyboardKey: THREE.MeshStandardMaterial;
  trackpadGlass: THREE.MeshPhysicalMaterial;
  xrayGhost: THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

function createPcbTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#092420';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.22)';
    ctx.lineWidth = 2;
    for (let i = 16; i < size; i += 24) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size * 0.42, i);
      ctx.lineTo(size * 0.55, i + 12);
      ctx.lineTo(size, i + 12);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.18)';
    ctx.lineWidth = 1.5;
    for (let x = 24; x < size; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }

    ctx.fillStyle = '#d4af37';
    for (let x = 32; x < size - 16; x += 48) {
      for (let y = 32; y < size - 16; y += 48) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createDisplayWallpaperTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#071526');
    grad.addColorStop(0.45, '#0c2c47');
    grad.addColorStop(1, '#081b2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
    ctx.lineWidth = 2;
    for (let r = 60; r <= 240; r += 45) {
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.45, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.fillRect(36, 44, w - 72, 12);
    ctx.fillRect(36, h - 72, w - 72, 24);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createDeviceMaterialLibrary(
  isSoftwareGl: boolean,
  maxAnisotropy: number
): DeviceMaterialLibrary {
  const pcbTex = createPcbTexture();
  pcbTex.anisotropy = maxAnisotropy;

  const screenTex = createDisplayWallpaperTexture();
  screenTex.anisotropy = maxAnisotropy;

  const titaniumFrame = new THREE.MeshPhysicalMaterial({
    color: 0x7c8594,
    metalness: 0.92,
    roughness: 0.24,
    anisotropy: 0.75,
    clearcoat: 0.15,
  });

  const aluminumChassis = new THREE.MeshPhysicalMaterial({
    color: 0xaab4c2,
    metalness: 0.9,
    roughness: 0.26,
    anisotropy: 0.8,
  });

  const darkChassis = new THREE.MeshPhysicalMaterial({
    color: 0x293241,
    metalness: 0.82,
    roughness: 0.34,
  });

  const oledGlass = new THREE.MeshPhysicalMaterial({
    color: 0x0b1220,
    metalness: 0.1,
    roughness: 0.06,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    transmission: isSoftwareGl ? 0 : 0.35,
    transparent: true,
    opacity: isSoftwareGl ? 0.82 : 0.95,
    ior: 1.52,
  });

  const oledScreen = new THREE.MeshStandardMaterial({
    map: screenTex,
    emissive: new THREE.Color(0x0ea5e9),
    emissiveMap: screenTex,
    emissiveIntensity: 0.45,
    roughness: 0.18,
    metalness: 0.1,
  });

  const pcbBoard = new THREE.MeshStandardMaterial({
    map: pcbTex,
    roughness: 0.55,
    metalness: 0.25,
  });

  const siliconDie = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.14,
    iridescence: 0.85,
    iridescenceIOR: 1.6,
    clearcoat: 0.9,
  });

  const memoryPackage = new THREE.MeshStandardMaterial({
    color: 0x161c26,
    roughness: 0.42,
    metalness: 0.3,
  });

  const copperThermal = new THREE.MeshPhysicalMaterial({
    color: 0xd97745,
    metalness: 0.94,
    roughness: 0.2,
    anisotropy: 0.65,
  });

  const batteryPack = new THREE.MeshStandardMaterial({
    color: 0x1e2530,
    roughness: 0.62,
    metalness: 0.22,
  });

  const cameraLens = new THREE.MeshPhysicalMaterial({
    color: 0x06101f,
    metalness: 0.2,
    roughness: 0.05,
    clearcoat: 1.0,
    iridescence: 0.9,
  });

  const cameraRing = new THREE.MeshPhysicalMaterial({
    color: 0x94a3b8,
    metalness: 0.95,
    roughness: 0.18,
  });

  const keyboardKey = new THREE.MeshStandardMaterial({
    color: 0x141b27,
    roughness: 0.68,
    metalness: 0.08,
  });

  const trackpadGlass = new THREE.MeshPhysicalMaterial({
    color: 0x334155,
    metalness: 0.35,
    roughness: 0.16,
    clearcoat: 0.6,
  });

  const xrayGhost = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    metalness: 0.1,
    roughness: 0.2,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  });

  const allMats = [
    titaniumFrame,
    aluminumChassis,
    darkChassis,
    oledGlass,
    oledScreen,
    pcbBoard,
    siliconDie,
    memoryPackage,
    copperThermal,
    batteryPack,
    cameraLens,
    cameraRing,
    keyboardKey,
    trackpadGlass,
    xrayGhost,
  ];

  return {
    titaniumFrame,
    aluminumChassis,
    darkChassis,
    oledGlass,
    oledScreen,
    pcbBoard,
    siliconDie,
    memoryPackage,
    copperThermal,
    batteryPack,
    cameraLens,
    cameraRing,
    keyboardKey,
    trackpadGlass,
    xrayGhost,
    dispose: () => {
      pcbTex.dispose();
      screenTex.dispose();
      allMats.forEach((m) => m.dispose());
    },
  };
}
