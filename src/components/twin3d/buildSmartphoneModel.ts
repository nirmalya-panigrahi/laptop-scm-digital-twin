import * as THREE from 'three';
import { DeviceMaterialLibrary } from './deviceMaterials';

export interface TwinSubAssembly {
  componentId: string;
  group: THREE.Group;
  basePosition: THREE.Vector3;
  explodeOffset: THREE.Vector3;
  focusPosition: THREE.Vector3;
  focusTarget: THREE.Vector3;
}

export interface DeviceModelHandle {
  root: THREE.Group;
  assemblies: TwinSubAssembly[];
  interactables: THREE.Object3D[];
  studioCameraPos: THREE.Vector3;
  studioTarget: THREE.Vector3;
  dispose: () => void;
}

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function tagInteractive(obj: THREE.Object3D, componentId: string, interactables: THREE.Object3D[]) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.userData.componentId = componentId;
      child.castShadow = true;
      child.receiveShadow = true;
      child.layers.enable(1);
      interactables.push(child);
    }
  });
}

export function buildSmartphoneModel(mats: DeviceMaterialLibrary): DeviceModelHandle {
  const root = new THREE.Group();
  const assemblies: TwinSubAssembly[] = [];
  const interactables: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // Phone lies horizontally slightly angled up on studio display or upright on Y
  // Dimensions in scene units: width 1.6, height 3.25, depth ~0.22
  const chassisGroup = new THREE.Group();
  const frameShape = createRoundedRectShape(1.62, 3.26, 0.22);
  const frameGeo = trackGeo(
    new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 4,
    })
  );
  frameGeo.center();
  const frameMesh = new THREE.Mesh(frameGeo, mats.titaniumFrame.clone());
  chassisGroup.add(frameMesh);

  // Side buttons (volume + power)
  const btnGeo = trackGeo(new THREE.BoxGeometry(0.03, 0.26, 0.05));
  const powerBtn = new THREE.Mesh(btnGeo, mats.titaniumFrame.clone());
  powerBtn.position.set(0.83, 0.35, 0);
  chassisGroup.add(powerBtn);

  const volUp = new THREE.Mesh(btnGeo, mats.titaniumFrame.clone());
  volUp.position.set(-0.83, 0.55, 0);
  chassisGroup.add(volUp);

  const volDn = new THREE.Mesh(btnGeo, mats.titaniumFrame.clone());
  volDn.position.set(-0.83, 0.2, 0);
  chassisGroup.add(volDn);

  // MagSafe induction copper/magnet ring on rear
  const ringGeo = trackGeo(new THREE.TorusGeometry(0.36, 0.022, 12, 36));
  const magRing = new THREE.Mesh(ringGeo, mats.cameraRing.clone());
  magRing.position.set(0, -0.1, -0.11);
  chassisGroup.add(magRing);

  chassisGroup.position.set(0, 1.75, 0);
  tagInteractive(chassisGroup, 'chassis-phone', interactables);
  root.add(chassisGroup);
  assemblies.push({
    componentId: 'chassis-phone',
    group: chassisGroup,
    basePosition: chassisGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0, -0.65),
    focusPosition: new THREE.Vector3(-2.6, 2.2, -2.5),
    focusTarget: new THREE.Vector3(0, 1.75, 0),
  });

  // 2. Copper Vapor Chamber & 5G RF Front-End
  const thermalGroup = new THREE.Group();
  const vaporGeo = trackGeo(new THREE.BoxGeometry(1.18, 1.9, 0.022));
  const vaporPlate = new THREE.Mesh(vaporGeo, mats.copperThermal.clone());
  thermalGroup.add(vaporPlate);

  const rfShieldGeo = trackGeo(new THREE.BoxGeometry(0.38, 0.72, 0.03));
  const rfShield = new THREE.Mesh(rfShieldGeo, mats.aluminumChassis.clone());
  rfShield.position.set(-0.42, -0.58, 0.02);
  thermalGroup.add(rfShield);

  const hapticGeo = trackGeo(new THREE.BoxGeometry(0.75, 0.28, 0.04));
  const hapticEngine = new THREE.Mesh(hapticGeo, mats.darkChassis.clone());
  hapticEngine.position.set(0, -1.16, 0.01);
  thermalGroup.add(hapticEngine);

  thermalGroup.position.set(0, 1.72, -0.02);
  tagInteractive(thermalGroup, 'thermal-phone', interactables);
  root.add(thermalGroup);
  assemblies.push({
    componentId: 'thermal-phone',
    group: thermalGroup,
    basePosition: thermalGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0, -0.25),
    focusPosition: new THREE.Vector3(2.4, 1.7, -2.1),
    focusTarget: new THREE.Vector3(0, 1.7, 0),
  });

  // 3. Stacked L-shaped Li-Ion Battery Pack
  const batGroup = new THREE.Group();
  const batMainGeo = trackGeo(new THREE.BoxGeometry(0.86, 1.72, 0.08));
  const batMain = new THREE.Mesh(batMainGeo, mats.batteryPack.clone());
  batMain.position.set(-0.22, -0.18, 0);
  batGroup.add(batMain);

  const batFootGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.78, 0.08));
  const batFoot = new THREE.Mesh(batFootGeo, mats.batteryPack.clone());
  batFoot.position.set(0.36, -0.65, 0);
  batGroup.add(batFoot);

  const bmsTabGeo = trackGeo(new THREE.BoxGeometry(0.62, 0.07, 0.03));
  const bmsTab = new THREE.Mesh(bmsTabGeo, mats.copperThermal.clone());
  bmsTab.position.set(-0.2, 0.72, 0.02);
  batGroup.add(bmsTab);

  batGroup.position.set(0, 1.72, 0.02);
  tagInteractive(batGroup, 'bat-phone', interactables);
  root.add(batGroup);
  assemblies.push({
    componentId: 'bat-phone',
    group: batGroup,
    basePosition: batGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0, 0.15),
    focusPosition: new THREE.Vector3(-2.3, 1.5, 2.2),
    focusTarget: new THREE.Vector3(-0.1, 1.5, 0),
  });

  // 4. Main Logic Board + 3nm SoC
  const socGroup = new THREE.Group();
  const pcbShape = createRoundedRectShape(0.68, 1.28, 0.06);
  const pcbGeo = trackGeo(
    new THREE.ExtrudeGeometry(pcbShape, { depth: 0.03, bevelEnabled: false })
  );
  pcbGeo.center();
  const pcbMesh = new THREE.Mesh(pcbGeo, mats.pcbBoard.clone());
  socGroup.add(pcbMesh);

  const socPackageGeo = trackGeo(new THREE.BoxGeometry(0.34, 0.34, 0.045));
  const socDie = new THREE.Mesh(socPackageGeo, mats.siliconDie.clone());
  socDie.position.set(0, 0.14, 0.03);
  socGroup.add(socDie);

  const ihsFrameGeo = trackGeo(new THREE.BoxGeometry(0.39, 0.39, 0.015));
  const ihsFrame = new THREE.Mesh(ihsFrameGeo, mats.aluminumChassis.clone());
  ihsFrame.position.set(0, 0.14, 0.012);
  socGroup.add(ihsFrame);

  socGroup.position.set(0.36, 2.24, 0.045);
  tagInteractive(socGroup, 'soc-phone', interactables);
  root.add(socGroup);
  assemblies.push({
    componentId: 'soc-phone',
    group: socGroup,
    basePosition: socGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0.28, 0.08, 0.42),
    focusPosition: new THREE.Vector3(1.85, 2.35, 1.85),
    focusTarget: new THREE.Vector3(0.35, 2.24, 0.2),
  });

  // 5. LPDDR5X + UFS 4.0 Memory Package
  const memGroup = new THREE.Group();
  const dramGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.24, 0.036));
  const dramChip = new THREE.Mesh(dramGeo, mats.memoryPackage.clone());
  dramChip.position.set(0, 0.16, 0);
  memGroup.add(dramChip);

  const nandGeo = trackGeo(new THREE.BoxGeometry(0.32, 0.28, 0.036));
  const nandChip = new THREE.Mesh(nandGeo, mats.memoryPackage.clone());
  nandChip.position.set(0, -0.18, 0);
  memGroup.add(nandChip);

  const pinStripGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.04, 0.02));
  const pinStrip = new THREE.Mesh(pinStripGeo, mats.copperThermal.clone());
  pinStrip.position.set(0, 0, -0.01);
  memGroup.add(pinStrip);

  memGroup.position.set(0.36, 1.88, 0.075);
  tagInteractive(memGroup, 'mem-phone', interactables);
  root.add(memGroup);
  assemblies.push({
    componentId: 'mem-phone',
    group: memGroup,
    basePosition: memGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0.35, -0.05, 0.65),
    focusPosition: new THREE.Vector3(1.85, 1.9, 1.9),
    focusTarget: new THREE.Vector3(0.36, 1.88, 0.25),
  });

  // 6. Triple Periscope Camera Array
  const camGroup = new THREE.Group();
  const bumpShape = createRoundedRectShape(0.68, 0.72, 0.12);
  const bumpGeo = trackGeo(
    new THREE.ExtrudeGeometry(bumpShape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 3,
    })
  );
  bumpGeo.center();
  const bumpHousing = new THREE.Mesh(bumpGeo, mats.darkChassis.clone());
  camGroup.add(bumpHousing);

  const lensRingGeo = trackGeo(new THREE.CylinderGeometry(0.13, 0.14, 0.07, 28));
  lensRingGeo.rotateX(Math.PI / 2);
  const lensGlassGeo = trackGeo(new THREE.CylinderGeometry(0.1, 0.1, 0.075, 24));
  lensGlassGeo.rotateX(Math.PI / 2);

  const lensOffsets: [number, number][] = [
    [-0.16, 0.16],
    [-0.16, -0.16],
    [0.16, 0.0],
  ];
  for (const [lx, ly] of lensOffsets) {
    const ring = new THREE.Mesh(lensRingGeo, mats.cameraRing.clone());
    ring.position.set(lx, ly, -0.05);
    camGroup.add(ring);

    const glass = new THREE.Mesh(lensGlassGeo, mats.cameraLens.clone());
    glass.position.set(lx, ly, -0.055);
    camGroup.add(glass);
  }

  camGroup.position.set(-0.34, 2.86, -0.11);
  tagInteractive(camGroup, 'cam-phone', interactables);
  root.add(camGroup);
  assemblies.push({
    componentId: 'cam-phone',
    group: camGroup,
    basePosition: camGroup.position.clone(),
    explodeOffset: new THREE.Vector3(-0.22, 0.22, -0.9),
    focusPosition: new THREE.Vector3(-2.1, 3.0, -2.2),
    focusTarget: new THREE.Vector3(-0.34, 2.86, -0.2),
  });

  // 7. 6.7" LTPO OLED Display Stack
  const oledGroup = new THREE.Group();
  const screenShape = createRoundedRectShape(1.48, 3.12, 0.17);
  const screenGeo = trackGeo(
    new THREE.ExtrudeGeometry(screenShape, { depth: 0.025, bevelEnabled: false })
  );
  screenGeo.center();
  const screenPanel = new THREE.Mesh(screenGeo, mats.oledScreen.clone());
  oledGroup.add(screenPanel);

  const glassShape = createRoundedRectShape(1.52, 3.16, 0.18);
  const glassGeo = trackGeo(
    new THREE.ExtrudeGeometry(glassShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
    })
  );
  glassGeo.center();
  const coverGlass = new THREE.Mesh(glassGeo, mats.oledGlass.clone());
  coverGlass.position.z = 0.025;
  oledGroup.add(coverGlass);

  // Dynamic sensor cutout bar
  const islandGeo = trackGeo(new THREE.BoxGeometry(0.38, 0.09, 0.02));
  const island = new THREE.Mesh(islandGeo, mats.memoryPackage.clone());
  island.position.set(0, 1.38, 0.032);
  oledGroup.add(island);

  oledGroup.position.set(0, 1.75, 0.11);
  tagInteractive(oledGroup, 'oled-phone', interactables);
  root.add(oledGroup);
  assemblies.push({
    componentId: 'oled-phone',
    group: oledGroup,
    basePosition: oledGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0, 1.05),
    focusPosition: new THREE.Vector3(1.6, 2.1, 3.1),
    focusTarget: new THREE.Vector3(0, 1.75, 0.35),
  });

  return {
    root,
    assemblies,
    interactables,
    studioCameraPos: new THREE.Vector3(3.1, 2.2, 3.6),
    studioTarget: new THREE.Vector3(0, 1.75, 0),
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
    },
  };
}
