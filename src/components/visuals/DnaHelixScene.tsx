import { useEffect, useRef, type CSSProperties } from 'react';
import * as THREE from 'three';

type DnaHelixSceneProps = {
  scrollLinked?: boolean;
  className?: string;
  intensity?: 'hero' | 'ambient';
};

function readThemeColor(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `hsl(${value})` : fallback;
}

export function DnaHelixScene({ scrollLinked = false, className, intensity = 'ambient' }: DnaHelixSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cleanup = () => {};
    let isDisposed = false;
    let scrollProgress = 0;
    let targetScrollProgress = 0;

    const updateScroll = () => {
      if (!scrollLinked) return;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      targetScrollProgress = window.scrollY / maxScroll;
    };

    if (isDisposed || !hostRef.current) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (error) {
      host.dataset.webgl = 'unavailable';
      return;
    }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 100);

      const group = new THREE.Group();
      scene.add(group);
      const fragmentGroup = new THREE.Group();
      scene.add(fragmentGroup);

      const primary = new THREE.Color(readThemeColor('--primary', 'hsl(0 78% 54%)'));
      const accent = new THREE.Color(readThemeColor('--accent', 'hsl(216 74% 55%)'));
      const bridgeColor = primary.clone().lerp(accent, 0.46).multiplyScalar(0.78);

      scene.add(new THREE.AmbientLight(0xffffff, intensity === 'hero' ? 0.9 : 0.7));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
      keyLight.position.set(4, 5, 8);
      scene.add(keyLight);
      const rimLight = new THREE.PointLight(primary, 3.2, 18);
      rimLight.position.set(-3, 2, 4);
      scene.add(rimLight);

      const strandMaterial = new THREE.MeshStandardMaterial({
        color: primary,
        emissive: primary.clone().multiplyScalar(0.3),
        metalness: 0.35,
        roughness: 0.24,
      });
      const pairedStrandMaterial = new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent.clone().multiplyScalar(0.28),
        metalness: 0.28,
        roughness: 0.28,
      });
      const rungMaterial = new THREE.MeshStandardMaterial({
        color: bridgeColor,
        transparent: true,
        opacity: 0.3,
        metalness: 0.18,
        roughness: 0.46,
      });
      const particleMaterial = new THREE.PointsMaterial({
        color: accent,
        size: intensity === 'hero' ? 0.045 : 0.034,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });

      const radius = intensity === 'hero' ? 1.18 : 0.92;
      const height = intensity === 'hero' ? 6.8 : 5.8;

      const platformMaterial = new THREE.MeshStandardMaterial({
        color: primary.clone().multiplyScalar(0.34),
        emissive: primary.clone().multiplyScalar(0.22),
        metalness: 0.72,
        roughness: 0.2,
        transparent: true,
        opacity: 0.86,
      });
      const platformAccentMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.72 });
      const platform = new THREE.Group();
      const baseY = -height / 2 - 0.32;
      const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.65, radius * 1.82, 0.2, 64), platformMaterial);
      baseDisc.position.y = baseY;
      platform.add(baseDisc);
      [1.52, 1.86, 2.2].forEach((ringRadius, ringIndex) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * ringRadius, 0.018 + ringIndex * 0.005, 8, 80), ringIndex === 1 ? platformAccentMaterial : platformMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = baseY + 0.13 - ringIndex * 0.035;
        platform.add(ring);
      });
      group.add(platform);

      const fragmentGeometry = new THREE.OctahedronGeometry(intensity === 'hero' ? 0.07 : 0.05, 0);
      const fragmentMaterial = new THREE.MeshStandardMaterial({ color: accent, emissive: accent.clone().multiplyScalar(0.35), metalness: 0.4, roughness: 0.26 });
      const fragments: THREE.Mesh[] = [];
      const fragmentCount = intensity === 'hero' ? 18 : 10;
      for (let index = 0; index < fragmentCount; index += 1) {
        const fragment = new THREE.Mesh(fragmentGeometry, fragmentMaterial);
        fragment.userData.phase = (index / fragmentCount) * Math.PI * 2;
        fragment.userData.radius = 2.15 + (index % 4) * 0.32;
        fragment.userData.speed = 0.08 + (index % 3) * 0.018;
        fragments.push(fragment);
        fragmentGroup.add(fragment);
      }

      const sphereGeometry = new THREE.SphereGeometry(intensity === 'hero' ? 0.095 : 0.065, 18, 18);
      const rungGeometry = new THREE.CylinderGeometry(0.018, 0.018, 1, 8);
      const turns = 3.15;
      const points = 54;

      for (let index = 0; index < points; index += 1) {
        const t = index / (points - 1);
        const y = (t - 0.5) * height;
        const angle = t * Math.PI * 2 * turns;
        const left = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        const right = new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);

        const leftNode = new THREE.Mesh(sphereGeometry, strandMaterial);
        leftNode.position.copy(left);
        group.add(leftNode);

        const rightNode = new THREE.Mesh(sphereGeometry, pairedStrandMaterial);
        rightNode.position.copy(right);
        group.add(rightNode);

        if (index % 2 === 0) {
          const midpoint = left.clone().add(right).multiplyScalar(0.5);
          const direction = right.clone().sub(left);
          const rung = new THREE.Mesh(rungGeometry, rungMaterial);
          rung.position.copy(midpoint);
          rung.scale.y = direction.length();
          rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
          group.add(rung);
        }
      }

      const particleCount = intensity === 'hero' ? 420 : 260;
      const positions = new Float32Array(particleCount * 3);
      for (let index = 0; index < particleCount; index += 1) {
        const orbit = 1.7 + Math.random() * 2.5;
        const angle = Math.random() * Math.PI * 2;
        positions[index * 3] = Math.cos(angle) * orbit;
        positions[index * 3 + 1] = (Math.random() - 0.5) * (height + 2.6);
        positions[index * 3 + 2] = Math.sin(angle) * orbit;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      group.add(particles);

      const applyThemeColors = () => {
        primary.set(readThemeColor('--primary', 'hsl(0 78% 54%)'));
        accent.set(readThemeColor('--accent', 'hsl(216 74% 55%)'));
        bridgeColor.copy(primary).lerp(accent, 0.46).multiplyScalar(0.78);
        strandMaterial.color.copy(primary);
        strandMaterial.emissive.copy(primary).multiplyScalar(0.3);
        pairedStrandMaterial.color.copy(accent);
        pairedStrandMaterial.emissive.copy(accent).multiplyScalar(0.28);
        rungMaterial.color.copy(bridgeColor);
        particleMaterial.color.copy(accent);
        rimLight.color.copy(primary);
        platformMaterial.color.copy(primary).multiplyScalar(0.34);
        platformMaterial.emissive.copy(primary).multiplyScalar(0.22);
        platformAccentMaterial.color.copy(accent);
        fragmentMaterial.color.copy(accent);
        fragmentMaterial.emissive.copy(accent).multiplyScalar(0.35);
      };

      const resize = () => {
        const width = Math.max(1, host.clientWidth);
        const heightPx = Math.max(1, host.clientHeight);
        camera.aspect = width / heightPx;
        camera.updateProjectionMatrix();
        renderer.setSize(width, heightPx);
      };

      const observer = new MutationObserver(applyThemeColors);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

      let frameId = 0;
      const tick = () => {
        const time = performance.now() * 0.001;
        scrollProgress += (targetScrollProgress - scrollProgress) * 0.055;
        const auto = reduceMotion ? 0 : time * 0.18;
        const scrollAngle = scrollLinked ? scrollProgress * Math.PI * 2.2 : 0;
        const orbitAngle = auto + scrollAngle;
        const orbitRadius = intensity === 'hero' ? 9.35 : 8.4;

        camera.position.set(Math.sin(orbitAngle) * orbitRadius, Math.sin(orbitAngle * 0.45) * 0.65, Math.cos(orbitAngle) * orbitRadius);
        camera.lookAt(0, 0, 0);

        group.rotation.y = reduceMotion ? scrollAngle * 0.2 : time * 0.12 + scrollAngle * 0.38;
        group.rotation.z = Math.sin(time * 0.35) * 0.04;
        particles.rotation.y = reduceMotion ? 0 : -time * 0.045;
        particles.rotation.x = reduceMotion ? 0 : Math.sin(time * 0.2) * 0.08;
        platform.rotation.y = reduceMotion ? 0 : time * 0.07;
        fragments.forEach((fragment, index) => {
          const phase = fragment.userData.phase as number;
          const speed = fragment.userData.speed as number;
          const fragmentRadius = fragment.userData.radius as number;
          const angle = phase + time * speed + scrollProgress * Math.PI;
          fragment.position.set(
            Math.cos(angle) * fragmentRadius,
            Math.sin(phase * 1.7 + time * 0.24) * (height * 0.47),
            Math.sin(angle) * fragmentRadius,
          );
          fragment.rotation.set(time * 0.12 + index, time * 0.16 + phase, time * 0.08);
        });

        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(tick);
      };

      applyThemeColors();
      updateScroll();
      resize();
      tick();

      if (scrollLinked) window.addEventListener('scroll', updateScroll, { passive: true });
      window.addEventListener('resize', resize);

    cleanup = () => {
      window.cancelAnimationFrame(frameId);
      if (scrollLinked) window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', resize);
      observer.disconnect();
      sphereGeometry.dispose();
      rungGeometry.dispose();
      particleGeometry.dispose();
      baseDisc.geometry.dispose();
      platform.children.forEach(child => { if (child instanceof THREE.Mesh && child !== baseDisc) child.geometry.dispose(); });
      fragmentGeometry.dispose();
      strandMaterial.dispose();
      pairedStrandMaterial.dispose();
      rungMaterial.dispose();
      particleMaterial.dispose();
      platformMaterial.dispose();
      platformAccentMaterial.dispose();
      fragmentMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };

    return () => {
      isDisposed = true;
      cleanup();
    };
  }, [scrollLinked, intensity]);

  return (
    <div ref={hostRef} aria-hidden="true" className={className}>
      <div className="dna-fallback">
        {Array.from({ length: 22 }).map((_, index) => (
          <span key={index} style={{ '--dna-index': index } as CSSProperties} />
        ))}
      </div>
    </div>
  );
}
