import * as THREE from 'three';
import { DeviceMaterialLibrary } from './deviceMaterials';
import { DeviceModelHandle, TwinSubAssembly } from './buildSmartphoneModel';

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

export function buildLaptopModel(mats: DeviceMaterialLibrary): DeviceModelHandle {
  const root = new THREE.Group();
  const assemblies: TwinSubAssembly[] = [];
  const interactables: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // Laptop base sits horizontally near y=0.14 (width 3.6, depth 2.5)
  // 1. CNC Unibody Aluminum Chassis
  const chassisGroup = new THREE.Group();
  const baseShape = createRoundedRectShape(3.6, 2.5, 0.14);
  const baseGeo = trackGeo(
    new THREE.ExtrudeGeometry(baseShape, {
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 3,
    })
  );
  baseGeo.rotateX(Math.PI / 2);
  baseGeo.center();
  const baseTray = new THREE.Mesh(baseGeo, mats.aluminumChassis.clone());
  chassisGroup.add(baseTray);

  // Rubber feet (4)
  const footGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.09, 0.03, 16));
  const footCoords: [number, number][] = [
    [-1.5, -1.0],
    [1.5, -1.0],
    [-1.5, 1.0],
    [1.5, 1.0],
  ];
  for (const [fx, fz] of footCoords) {
    const foot = new THREE.Mesh(footGeo, mats.keyboardKey.clone());
    foot.position.set(fx, -0.075, fz);
    chassisGroup.add(foot);
  }

  // Hinge barrel
  const hingeGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 2.4, 20));
  hingeGeo.rotateZ(Math.PI / 2);
  const hinge = new THREE.Mesh(hingeGeo, mats.darkChassis.clone());
  hinge.position.set(0, 0.09, -1.2);
  chassisGroup.add(hinge);

  chassisGroup.position.set(0, 0.1, 0);
  tagInteractive(chassisGroup, 'chassis-laptop', interactables);
  root.add(chassisGroup);
  assemblies.push({
    componentId: 'chassis-laptop',
    group: chassisGroup,
    basePosition: chassisGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, -0.45, 0),
    focusPosition: new THREE.Vector3(-3.8, 1.6, 3.6),
    focusTarget: new THREE.Vector3(0, 0.15, 0),
  });

  // 2. 99.9Wh 6-Cell Li-Po Battery Bank (front half inside base)
  const batGroup = new THREE.Group();
  const cellGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.06, 0.72));
  for (let i = 0; i < 6; i++) {
    const cell = new THREE.Mesh(cellGeo, mats.batteryPack.clone());
    const xPos = -1.25 + i * 0.5;
    cell.position.set(xPos, 0, 0);
    batGroup.add(cell);
  }
  const busbarGeo = trackGeo(new THREE.BoxGeometry(2.9, 0.02, 0.08));
  const busbar = new THREE.Mesh(busbarGeo, mats.copperThermal.clone());
  busbar.position.set(0, 0.035, -0.34);
  batGroup.add(busbar);

  batGroup.position.set(0, 0.16, 0.68);
  tagInteractive(batGroup, 'bat-laptop', interactables);
  root.add(batGroup);
  assemblies.push({
    componentId: 'bat-laptop',
    group: batGroup,
    basePosition: batGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0.25, 0.35),
    focusPosition: new THREE.Vector3(2.8, 1.7, 3.2),
    focusTarget: new THREE.Vector3(0, 0.2, 0.65),
  });

  // 3. Main Logic Board & 3nm Pro SoC
  const socGroup = new THREE.Group();
  const pcbGeo = trackGeo(new THREE.BoxGeometry(2.4, 0.035, 0.78));
  const pcb = new THREE.Mesh(pcbGeo, mats.pcbBoard.clone());
  socGroup.add(pcb);

  const socDieGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.04, 0.46));
  const socDie = new THREE.Mesh(socDieGeo, mats.siliconDie.clone());
  socDie.position.set(0, 0.035, 0);
  socGroup.add(socDie);

  socGroup.position.set(0, 0.17, -0.58);
  tagInteractive(socGroup, 'soc-laptop', interactables);
  root.add(socGroup);
  assemblies.push({
    componentId: 'soc-laptop',
    group: socGroup,
    basePosition: socGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0.45, -0.1),
    focusPosition: new THREE.Vector3(2.2, 2.1, 2.0),
    focusTarget: new THREE.Vector3(0, 0.3, -0.55),
  });

  // 4. Unified DRAM + Gen5 NVMe Array
  const memGroup = new THREE.Group();
  const dramChipGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.042, 0.28));
  const dramLeft = new THREE.Mesh(dramChipGeo, mats.memoryPackage.clone());
  dramLeft.position.set(-0.38, 0, 0);
  memGroup.add(dramLeft);

  const dramRight = new THREE.Mesh(dramChipGeo, mats.memoryPackage.clone());
  dramRight.position.set(0.38, 0, 0);
  memGroup.add(dramRight);

  const nvmeGeo = trackGeo(new THREE.BoxGeometry(0.85, 0.038, 0.24));
  const nvme = new THREE.Mesh(nvmeGeo, mats.memoryPackage.clone());
  nvme.position.set(0.86, 0, -0.18);
  memGroup.add(nvme);

  memGroup.position.set(0, 0.21, -0.58);
  tagInteractive(memGroup, 'mem-laptop', interactables);
  root.add(memGroup);
  assemblies.push({
    componentId: 'mem-laptop',
    group: memGroup,
    basePosition: memGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0.2, 0.72, -0.15),
    focusPosition: new THREE.Vector3(2.5, 2.2, 1.8),
    focusTarget: new THREE.Vector3(0.35, 0.4, -0.58),
  });

  // 5. Dual-Fan Copper Vapor Thermal Module
  const thermalGroup = new THREE.Group();
  const fanHousingGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 24));
  const fanLeft = new THREE.Mesh(fanHousingGeo, mats.darkChassis.clone());
  fanLeft.position.set(-1.15, 0, 0);
  thermalGroup.add(fanLeft);

  const fanRight = new THREE.Mesh(fanHousingGeo, mats.darkChassis.clone());
  fanRight.position.set(1.15, 0, 0);
  thermalGroup.add(fanRight);

  const heatpipeGeo = trackGeo(new THREE.BoxGeometry(2.3, 0.03, 0.18));
  const heatpipe = new THREE.Mesh(heatpipeGeo, mats.copperThermal.clone());
  heatpipe.position.set(0, 0.02, 0);
  thermalGroup.add(heatpipe);

  const coldPlateGeo = trackGeo(new THREE.BoxGeometry(0.54, 0.04, 0.52));
  const coldPlate = new THREE.Mesh(coldPlateGeo, mats.copperThermal.clone());
  coldPlate.position.set(0, 0.02, 0.08);
  thermalGroup.add(coldPlate);

  thermalGroup.position.set(0, 0.23, -0.64);
  tagInteractive(thermalGroup, 'thermal-laptop', interactables);
  root.add(thermalGroup);
  assemblies.push({
    componentId: 'thermal-laptop',
    group: thermalGroup,
    basePosition: thermalGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0.96, -0.22),
    focusPosition: new THREE.Vector3(-2.6, 2.4, 2.2),
    focusTarget: new THREE.Vector3(0, 0.5, -0.64),
  });

  // 6. Haptic Trackpad, Keyboard & I/O Deck (Top C-cover)
  const ioGroup = new THREE.Group();
  const deckShape = createRoundedRectShape(3.52, 2.42, 0.12);
  const deckGeo = trackGeo(
    new THREE.ExtrudeGeometry(deckShape, { depth: 0.024, bevelEnabled: false })
  );
  deckGeo.rotateX(Math.PI / 2);
  deckGeo.center();
  const deckPlate = new THREE.Mesh(deckGeo, mats.aluminumChassis.clone());
  ioGroup.add(deckPlate);

  // Keyboard well + key grid (merged visual rows)
  const keyGeo = trackGeo(new THREE.BoxGeometry(2.45, 0.018, 0.85));
  const keyWell = new THREE.Mesh(keyGeo, mats.keyboardKey.clone());
  keyWell.position.set(0, 0.014, -0.25);
  ioGroup.add(keyWell);

  // Haptic Force-Touch Trackpad
  const padGeo = trackGeo(new THREE.BoxGeometry(1.18, 0.016, 0.72));
  const trackpad = new THREE.Mesh(padGeo, mats.trackpadGlass.clone());
  trackpad.position.set(0, 0.015, 0.72);
  ioGroup.add(trackpad);

  // Speaker grilles left & right
  const spkGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.014, 0.92));
  const spkL = new THREE.Mesh(spkGeo, mats.darkChassis.clone());
  spkL.position.set(-1.46, 0.014, -0.25);
  ioGroup.add(spkL);
  const spkR = new THREE.Mesh(spkGeo, mats.darkChassis.clone());
  spkR.position.set(1.46, 0.014, -0.25);
  ioGroup.add(spkR);

  ioGroup.position.set(0, 0.25, 0);
  tagInteractive(ioGroup, 'io-laptop', interactables);
  root.add(ioGroup);
  assemblies.push({
    componentId: 'io-laptop',
    group: ioGroup,
    basePosition: ioGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 1.25, 0.1),
    focusPosition: new THREE.Vector3(0.4, 2.7, 3.4),
    focusTarget: new THREE.Vector3(0, 0.45, 0.2),
  });

  // 7. 16" Mini-LED / Tandem OLED Lid Assembly (tilted 108 deg)
  const lidGroup = new THREE.Group();
  const lidShellShape = createRoundedRectShape(3.58, 2.38, 0.12);
  const lidShellGeo = trackGeo(
    new THREE.ExtrudeGeometry(lidShellShape, {
      depth: 0.055,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    })
  );
  lidShellGeo.center();
  const lidShell = new THREE.Mesh(lidShellGeo, mats.aluminumChassis.clone());
  lidShell.position.set(0, 1.19, 0);
  lidGroup.add(lidShell);

  const panelGeo = trackGeo(new THREE.BoxGeometry(3.38, 2.16, 0.02));
  const panel = new THREE.Mesh(panelGeo, mats.oledScreen.clone());
  panel.position.set(0, 1.2, 0.032);
  lidGroup.add(panel);

  const lidGlassGeo = trackGeo(new THREE.BoxGeometry(3.48, 2.26, 0.014));
  const lidGlass = new THREE.Mesh(lidGlassGeo, mats.oledGlass.clone());
  lidGlass.position.set(0, 1.2, 0.045);
  lidGroup.add(lidGlass);

  lidGroup.position.set(0, 0.22, -1.2);
  lidGroup.rotation.x = -0.24; // Open lid angle ~104 degrees from base
  tagInteractive(lidGroup, 'oled-laptop', interactables);
  root.add(lidGroup);
  assemblies.push({
    componentId: 'oled-laptop',
    group: lidGroup,
    basePosition: lidGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0.65, -0.75),
    focusPosition: new THREE.Vector3(1.8, 2.2, 3.5),
    focusTarget: new THREE.Vector3(0, 1.35, -1.25),
  });

  return {
    root,
    assemblies,
    interactables,
    studioCameraPos: new THREE.Vector3(3.9, 2.6, 4.1),
    studioTarget: new THREE.Vector3(0, 0.85, -0.2),
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
