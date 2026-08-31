import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Complex } from "./quantumEngine";

function createTextSprite(text: string, color = "#ffffff") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  ctx.font = "Bold 48px sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.4, 0.2, 1);
  return sprite;
}

export function statevectorToBloch(c0: Complex, c1: Complex) {
  const normSq = c0.re ** 2 + c0.im ** 2 + (c1.re ** 2 + c1.im ** 2);
  const norm = Math.sqrt(normSq) || 1;

  const a0 = c0.re / norm;
  const b0 = c0.im / norm;
  const a1 = c1.re / norm;
  const b1 = c1.im / norm;

  return {
    x: 2 * (a0 * a1 + b0 * b1),
    y: 2 * (a0 * b1 - b0 * a1),
    z: a0 ** 2 + b0 ** 2 - (a1 ** 2 + b1 ** 2),
  };
}

export function createBlochSphere(containerElement: HTMLElement) {
  const width = containerElement.clientWidth || 400;
  const height = containerElement.clientHeight || 400;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(2.8, 2.2, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  containerElement.innerHTML = "";
  containerElement.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const sphereGeo = new THREE.SphereGeometry(1, 32, 32);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x6366f1,
    transparent: true,
    opacity: 0.12,
    wireframe: true,
  });
  scene.add(new THREE.Mesh(sphereGeo, sphereMat));

  const ringGeo = new THREE.RingGeometry(0.995, 1.005, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x64748b,
    side: THREE.DoubleSide,
  });
  const equatorRing = new THREE.Mesh(ringGeo, ringMat);
  equatorRing.rotation.x = Math.PI / 2;
  scene.add(equatorRing);

  const axesConfig = [
    {
      dir: new THREE.Vector3(0, 1, 0),
      color: "#3b82f6",
      label: "|0⟩ (+Z)",
      labelPos: new THREE.Vector3(0, 1.3, 0),
    },
    {
      dir: new THREE.Vector3(0, -1, 0),
      color: "#3b82f6",
      label: "|1⟩ (-Z)",
      labelPos: new THREE.Vector3(0, -1.3, 0),
    },
    {
      dir: new THREE.Vector3(1, 0, 0),
      color: "#ef4444",
      label: "|+⟩ (+X)",
      labelPos: new THREE.Vector3(1.3, 0, 0),
    },
    {
      dir: new THREE.Vector3(-1, 0, 0),
      color: "#ef4444",
      label: "|-⟩ (-X)",
      labelPos: new THREE.Vector3(-1.3, 0, 0),
    },
    {
      dir: new THREE.Vector3(0, 0, 1),
      color: "#10b981",
      label: "|i+⟩ (+Y)",
      labelPos: new THREE.Vector3(0, 0, 1.3),
    },
    {
      dir: new THREE.Vector3(0, 0, -1),
      color: "#10b981",
      label: "|i-⟩ (-Y)",
      labelPos: new THREE.Vector3(0, 0, -1.3),
    },
  ];

  axesConfig.forEach(({ dir, color, label, labelPos }) => {
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      dir.clone().multiplyScalar(1.15),
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
    });
    scene.add(new THREE.Line(lineGeo, lineMat));

    const sprite = createTextSprite(label, color);
    sprite.position.copy(labelPos);
    scene.add(sprite);
  });

  const currentDir = new THREE.Vector3(0, 1, 0);
  const targetDir = new THREE.Vector3(0, 1, 0);
  const vectorArrow = new THREE.ArrowHelper(
    currentDir,
    new THREE.Vector3(0, 0, 0),
    1.0,
    0xf59e0b,
    0.15,
    0.08
  );
  scene.add(vectorArrow);

  function updateState(c0: Complex, c1: Complex) {
    const { x, y, z } = statevectorToBloch(c0, c1);
    targetDir.set(x, z, y).normalize();
  }

  const resizeObserver = new ResizeObserver(() => {
    const w = containerElement.clientWidth;
    const h = containerElement.clientHeight;
    if (w && h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  });
  resizeObserver.observe(containerElement);

  let isRunning = true;
  function animate() {
    if (!isRunning) return;
    requestAnimationFrame(animate);

    currentDir.lerp(targetDir, 0.1).normalize();
    vectorArrow.setDirection(currentDir);

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  function destroy() {
    isRunning = false;
    resizeObserver.disconnect();
    controls.dispose();
    renderer.dispose();
    containerElement.innerHTML = "";
  }

  return { updateState, destroy };
}

export type BlochSphereHandle = ReturnType<typeof createBlochSphere>;
