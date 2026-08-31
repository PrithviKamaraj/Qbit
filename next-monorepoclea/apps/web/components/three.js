import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createBlochSphere(container) {
  const width = container.clientWidth || 380;
  const height = container.clientHeight || 380;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(2.4, 1.8, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x171717, 0); // Transparent background
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  const sphereGroup = new THREE.Group();
  scene.add(sphereGroup);

  // 1. Clean Outer Wireframe Shell
  const sphereGeo = new THREE.SphereGeometry(1, 32, 24);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x00e5a3,
    wireframe: true,
    transparent: true,
    opacity: 0.22
  });
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  sphereGroup.add(sphereMesh);

  // 2. Translucent Inner Core
  const innerSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.99, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0x1f1f1f, transparent: true, opacity: 0.3 })
  );
  sphereGroup.add(innerSphere);

  // 3. Equator Ring (Amber Accent)
  const equatorPoints = [];
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    equatorPoints.push(new THREE.Vector3(Math.cos(t), 0, Math.sin(t)));
  }
  const equatorGeo = new THREE.BufferGeometry().setFromPoints(equatorPoints);
  const equatorLine = new THREE.Line(
    equatorGeo,
    new THREE.LineBasicMaterial({ color: 0xf5a623, transparent: true, opacity: 0.65 })
  );
  sphereGroup.add(equatorLine);

  // 4. Coordinate Axes (X, Z, Y)
  const createAxis = (start, end, colorHex) => {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: colorHex, opacity: 0.45, transparent: true }));
  };
  sphereGroup.add(createAxis(new THREE.Vector3(-1.25, 0, 0), new THREE.Vector3(1.25, 0, 0), 0xe74c4c)); // X
  sphereGroup.add(createAxis(new THREE.Vector3(0, -1.25, 0), new THREE.Vector3(0, 1.25, 0), 0xf5a623)); // Z
  sphereGroup.add(createAxis(new THREE.Vector3(0, 0, -1.25), new THREE.Vector3(0, 0, 1.25), 0x00d2ff)); // Y

  // 5. Target State Marker (Translucent Golden Beacon)
  const targetMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.85 })
  );
  targetMarker.position.set(0, 1, 0); // Default |0⟩
  sphereGroup.add(targetMarker);

  // 6. Current State Vector Arrow (Electric Red)
  let currentDir = new THREE.Vector3(0, 1, 0);
  let targetDir = new THREE.Vector3(0, 1, 0);
  const arrow = new THREE.ArrowHelper(currentDir, new THREE.Vector3(0, 0, 0), 1, 0xe74c4c, 0.16, 0.08);
  sphereGroup.add(arrow);

  let reqId;
  const animateLoop = () => {
    reqId = requestAnimationFrame(animateLoop);
    controls.update();

    currentDir.lerp(targetDir, 0.18).normalize();
    arrow.setDirection(currentDir);

    renderer.render(scene, camera);
  };
  animateLoop();

  return {
    triggerExplosion: () => {},
    setScrollProgress: (progress) => {
      // Rotate whole sphere as user scrolls
      sphereGroup.rotation.y = progress * Math.PI * 4;
      sphereGroup.rotation.x = Math.sin(progress * Math.PI * 2) * 0.35;

      // Animate vector dynamically through scroll positions
      const theta = progress * Math.PI;
      const phi = progress * Math.PI * 3;
      const x = Math.sin(theta) * Math.cos(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(theta);
      targetDir.set(x, z, -y).normalize();
    },
    updateState: (c0, c1) => {
      const x = 2 * (c0.re * c1.re + c0.im * c1.im);
      const y = 2 * (c1.im * c0.re - c1.re * c0.im);
      const z = (c0.re ** 2 + c0.im ** 2) - (c1.re ** 2 + c1.im ** 2);
      targetDir.set(x, z, -y).normalize();
    },
    updateTargetMarker: (targetCoords) => {
      if (targetCoords) {
        targetMarker.position.set(targetCoords.x, targetCoords.z, -targetCoords.y);
      }
    },
    destroy: () => {
      cancelAnimationFrame(reqId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    }
  };
}