import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Camera, ChevronDown, ChevronUp, Cpu, Eye, Layers, RotateCcw } from 'lucide-react';
import { DeviceType, ElectronicsComponent } from '../../types/scm';
import { createDeviceMaterialLibrary } from './deviceMaterials';
import { buildSmartphoneModel, DeviceModelHandle } from './buildSmartphoneModel';
import { buildLaptopModel } from './buildLaptopModel';

type XrayMode = 'auto' | 'solid' | 'xray';
type CameraPreset = 'focus' | 'studio' | 'top';

interface DeviceTwinViewportProps {
  deviceType: DeviceType;
  components: ElectronicsComponent[];
  selectedComponentId: string;
  onSelectComponent: (id: string) => void;
  useSubstitution: boolean;
  calculatedShockPct: number;
  className?: string;
}

const _camGoal = new THREE.Vector3();
const _targetGoal = new THREE.Vector3();
const _pointer = new THREE.Vector2();
const _shockColor = new THREE.Color();
const _zeroEmissive = new THREE.Color(0x000000);

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(2, 6, 23, 0.86)');
    grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.4)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function DeviceTwinViewport({
  deviceType,
  components,
  selectedComponentId,
  onSelectComponent,
  useSubstitution,
  calculatedShockPct,
  className = 'h-[430px] sm:h-[490px]',
}: DeviceTwinViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [explodeTarget, setExplodeTarget] = useState(0.45);
  const [xrayMode, setXrayMode] = useState<XrayMode>('auto');
  const [dockOpen, setDockOpen] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const deviceTypeRef = useRef(deviceType);
  const selectedIdRef = useRef(selectedComponentId);
  const onSelectRef = useRef(onSelectComponent);
  const explodeTargetRef = useRef(explodeTarget);
  const xrayModeRef = useRef(xrayMode);
  const useSubRef = useRef(useSubstitution);
  const shockRef = useRef(calculatedShockPct);

  const requestRenderRef = useRef<() => void>(() => {});
  const applyPresetRef = useRef<(preset: CameraPreset) => void>(() => {});
  const rebuildDeviceRef = useRef<(dt: DeviceType) => void>(() => {});

  deviceTypeRef.current = deviceType;
  selectedIdRef.current = selectedComponentId;
  onSelectRef.current = onSelectComponent;
  explodeTargetRef.current = explodeTarget;
  xrayModeRef.current = xrayMode;
  useSubRef.current = useSubstitution;
  shockRef.current = calculatedShockPct;

  const selectedMeta = components.find((c) => c.id === selectedComponentId);
  const hoveredMeta = hoveredId ? components.find((c) => c.id === hoveredId) : null;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 640, container.clientHeight || 460);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090f1e);
    scene.fog = new THREE.FogExp2(0x090f1e, 0.045);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 460;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 1.8;
    controls.maxDistance = 11.0;
    controls.maxPolarAngle = Math.PI * 0.62;

    // 3-point studio lighting + hemisphere contrast
    const hemiLight = new THREE.HemisphereLight(0xcbd5e1, 0x0f172a, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.85);
    keyLight.position.set(4.5, 6.5, 4.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.camera.left = -3.5;
    keyLight.shadow.camera.right = 3.5;
    keyLight.shadow.camera.top = 3.5;
    keyLight.shadow.camera.bottom = -3.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
    rimLight.position.set(-4.2, 3.8, -4.5);
    scene.add(rimLight);

    let areaLight1: THREE.RectAreaLight | null = null;
    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      areaLight1 = new THREE.RectAreaLight(0xe0f2fe, 2.2, 4.5, 2.2);
      areaLight1.position.set(0, 5.2, 2.5);
      areaLight1.lookAt(0, 0.8, 0);
      scene.add(areaLight1);
    }

    // Studio floor + contact shadow plane
    const shadowTex = createContactShadowTexture();
    const shadowPlaneGeo = new THREE.PlaneGeometry(5.6, 5.6);
    shadowPlaneGeo.rotateX(-Math.PI / 2);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.78,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.position.y = -0.04;
    scene.add(shadowPlane);

    const gridHelper = new THREE.GridHelper(10, 20, 0x1e293b, 0x131d33);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const mats = createDeviceMaterialLibrary(isSoftwareGl, maxAniso);

    let currentHandle: DeviceModelHandle | null = null;
    let currentExplode = explodeTargetRef.current;
    let camAnimating = false;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    const applyVisualHighlight = () => {
      if (!currentHandle) return;
      const selId = selectedIdRef.current;
      const mode = xrayModeRef.current;
      const shock = shockRef.current;
      const isSub = useSubRef.current;

      if (shock > 25) _shockColor.setHex(0xf43f5e);
      else if (shock > 10) _shockColor.setHex(0xf59e0b);
      else if (isSub) _shockColor.setHex(0x10b981);
      else _shockColor.setHex(0x22d3ee);

      for (const asm of currentHandle.assemblies) {
        const isSelected = asm.componentId === selId;
        const makeXray = mode === 'xray' || (mode === 'auto' && !isSelected && explodeTargetRef.current < 0.15);

        asm.group.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh) return;
          const mesh = child as THREE.Mesh;
          const m = mesh.material as THREE.MeshStandardMaterial;
          if (!m || typeof m.opacity !== 'number') return;

          if (m.userData.origOpacity === undefined) {
            m.userData.origOpacity = m.opacity;
            m.userData.origTransparent = m.transparent;
          }

          if (isSelected) {
            m.transparent = m.userData.origTransparent;
            m.opacity = m.userData.origOpacity;
            m.depthWrite = true;
            if (m.emissive) {
              m.emissive.copy(_shockColor);
              m.emissiveIntensity = 0.38;
            }
          } else if (makeXray) {
            m.transparent = true;
            m.opacity = 0.22;
            m.depthWrite = false;
            if (m.emissive) {
              m.emissive.copy(_zeroEmissive);
              m.emissiveIntensity = 0;
            }
          } else {
            m.transparent = m.userData.origTransparent;
            m.opacity = m.userData.origOpacity;
            m.depthWrite = true;
            if (m.emissive) {
              m.emissive.copy(_zeroEmissive);
              m.emissiveIntensity = 0;
            }
          }
        });
      }
    };

    const mountModel = (dt: DeviceType) => {
      if (currentHandle) {
        scene.remove(currentHandle.root);
        currentHandle.dispose();
        currentHandle = null;
      }
      currentHandle = dt === 'smartphone' ? buildSmartphoneModel(mats) : buildLaptopModel(mats);
      scene.add(currentHandle.root);

      camera.position.copy(currentHandle.studioCameraPos);
      controls.target.copy(currentHandle.studioTarget);
      controls.update();
      camAnimating = false;

      // Apply immediate explode offset on mount
      for (const asm of currentHandle.assemblies) {
        asm.group.position.copy(asm.basePosition).addScaledVector(asm.explodeOffset, currentExplode);
      }
      applyVisualHighlight();
      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }
    };

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        const now = performance.now();
        const delta = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        let needsMoreFrames = false;

        if (currentHandle) {
          const targetExp = explodeTargetRef.current;
          if (Math.abs(currentExplode - targetExp) > 0.002) {
            currentExplode = THREE.MathUtils.damp(currentExplode, targetExp, 9, delta);
            needsMoreFrames = true;
          } else {
            currentExplode = targetExp;
          }

          for (const asm of currentHandle.assemblies) {
            asm.group.position
              .copy(asm.basePosition)
              .addScaledVector(asm.explodeOffset, currentExplode);
          }
        }

        if (camAnimating) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoal.x, 7, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoal.y, 7, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoal.z, 7, delta);

          controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetGoal.x, 7, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetGoal.y, 7, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetGoal.z, 7, delta);

          if (camera.position.distanceTo(_camGoal) > 0.02 || controls.target.distanceTo(_targetGoal) > 0.02) {
            needsMoreFrames = true;
          } else {
            camAnimating = false;
          }
        }

        controls.update();
        applyVisualHighlight();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsMoreFrames) {
            requestRender();
          }
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;
    rebuildDeviceRef.current = (dt: DeviceType) => {
      mountModel(dt);
      requestRender();
    };

    applyPresetRef.current = (preset: CameraPreset) => {
      if (!currentHandle) return;
      if (preset === 'studio') {
        _camGoal.copy(currentHandle.studioCameraPos);
        _targetGoal.copy(currentHandle.studioTarget);
      } else if (preset === 'top') {
        _camGoal.set(0.01, 5.2, 0.8);
        _targetGoal.copy(currentHandle.studioTarget);
      } else {
        const asm = currentHandle.assemblies.find((a) => a.componentId === selectedIdRef.current);
        if (asm) {
          _camGoal.copy(asm.focusPosition);
          _targetGoal.copy(asm.focusTarget);
        } else {
          _camGoal.copy(currentHandle.studioCameraPos);
          _targetGoal.copy(currentHandle.studioTarget);
        }
      }
      camAnimating = true;
      requestRender();
    };

    mountModel(deviceTypeRef.current);
    requestRender();

    const onControlsChange = () => requestRender();
    const onControlsStart = () => {
      camAnimating = false;
    };
    controls.addEventListener('change', onControlsChange);
    controls.addEventListener('start', onControlsStart);

    // Raycasting for click & throttled hover
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let lastHoverTs = 0;
    let pointerDownPos = { x: 0, y: 0 };

    const updatePointer = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };

    const onPointerMove = (ev: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTs < 60) return;
      lastHoverTs = now;
      if (!currentHandle) return;

      updatePointer(ev);
      raycaster.setFromCamera(_pointer, camera);
      const hits = raycaster.intersectObjects(currentHandle.interactables, false);
      const nextHover = hits.length > 0 ? (hits[0].object.userData.componentId as string) : null;
      setHoveredId((prev) => (prev === nextHover ? prev : nextHover));
      renderer.domElement.style.cursor = nextHover ? 'pointer' : 'grab';
    };

    const onPointerUp = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y);
      if (dist > 6 || !currentHandle) return;
      updatePointer(ev);
      raycaster.setFromCamera(_pointer, camera);
      const hits = raycaster.intersectObjects(currentHandle.interactables, false);
      if (hits.length > 0) {
        const compId = hits[0].object.userData.componentId as string | undefined;
        if (compId) {
          onSelectRef.current(compId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', onControlsChange);
      controls.removeEventListener('start', onControlsStart);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      if (currentHandle) currentHandle.dispose();
      mats.dispose();
      shadowTex.dispose();
      shadowPlaneGeo.dispose();
      shadowPlaneMat.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    rebuildDeviceRef.current(deviceType);
  }, [deviceType]);

  useEffect(() => {
    requestRenderRef.current();
  }, [selectedComponentId, explodeTarget, xrayMode, useSubstitution, calculatedShockPct]);

  const handlePresetClick = useCallback((preset: CameraPreset) => {
    applyPresetRef.current(preset);
  }, []);

  const handleResetView = useCallback(() => {
    setExplodeTarget(0.45);
    setXrayMode('auto');
    applyPresetRef.current('studio');
  }, []);

  return (
    <div className={`relative rounded-xl border border-slate-800 bg-[#090f1e] overflow-hidden select-none ${className}`}>
      {/* Isolated WebGL canvas mount container */}
      <div ref={mountRef} className="w-full h-full" aria-label="Interactive 3D Device Digital Twin" />

      {/* WebGL unavailable / test environment graceful fallback */}
      {webglUnavailable && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#090f1e]">
          <Cpu size={32} className="text-cyan-400 mb-3" />
          <p className="text-sm font-semibold text-slate-200 mb-1">
            {deviceType === 'smartphone' ? 'Flagship 5G Smartphone' : '16" Pro Workstation Laptop'} Digital Twin
          </p>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Interactive 3D inspection requires WebGL hardware acceleration. Select assemblies directly below:
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-lg">
            {components.map((comp) => (
              <button
                key={comp.id}
                type="button"
                onClick={() => onSelectComponent(comp.id)}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer ${
                  comp.id === selectedComponentId
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {comp.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top-Left minimal active component readout (unboxed text) */}
      <div className="pointer-events-none absolute top-4 left-5 right-5 flex items-start justify-between gap-4">
        <div className="bg-[#0b1120]/90 border border-slate-800 rounded-lg px-3.5 py-2 max-w-[75%]">
          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>{deviceType === 'smartphone' ? 'Smartphone Twin' : 'Laptop Twin'}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{selectedMeta?.category}</span>
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-100 truncate mt-0.5">
            {hoveredMeta ? `Inspect: ${hoveredMeta.name}` : selectedMeta?.name}
          </div>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (zero side occlusion) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-[720px] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockOpen((prev) => !prev)}
          className="mb-1.5 px-3 py-1 bg-[#0b1120]/95 border border-slate-700/80 rounded-t-lg text-[11px] font-mono text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
        >
          {dockOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          {dockOpen ? 'Hide Controls' : 'Show 3D Controls'}
        </button>

        {dockOpen && (
          <div className="w-full bg-[#0b1120]/95 border border-slate-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Explode Slider */}
            <div className="flex items-center gap-3 min-w-[165px]">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 shrink-0">
                <Layers size={13} className="text-cyan-400" />
                Explode
              </span>
              <input
                type="range"
                aria-label="Explode 3D layers"
                min="0"
                max="1"
                step="0.05"
                value={explodeTarget}
                onChange={(e) => setExplodeTarget(parseFloat(e.target.value))}
                className="twin-slider w-full"
              />
            </div>

            {/* X-Ray Segmented Buttons */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0">
              <Eye size={13} className="text-slate-400 mx-1.5 shrink-0" />
              {(['auto', 'solid', 'xray'] as XrayMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setXrayMode(mode)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    xrayMode === mode
                      ? 'bg-slate-800 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode === 'auto' ? 'Auto' : mode === 'solid' ? 'Solid' : 'X-Ray'}
                </button>
              ))}
            </div>

            {/* Camera Presets */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Camera size={13} className="text-slate-400 mr-0.5 hidden sm:inline shrink-0" />
              {(['focus', 'studio', 'top'] as CameraPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="px-2.5 py-1 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  {preset === 'focus' ? 'Focus' : preset === 'studio' ? 'Studio' : 'Top'}
                </button>
              ))}
              <button
                type="button"
                onClick={handleResetView}
                title="Reset 3D viewport"
                aria-label="Reset 3D viewport"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 rounded-md transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
