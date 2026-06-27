import { useEffect, useRef, type CSSProperties } from 'react';
import * as THREE from 'three';

type DnaHelixSceneProps = {
  scrollLinked?: boolean;
  className?: string;
  intensity?: 'hero' | 'ambient';
};

function readThemeColor(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  const [hue, saturation, lightness] = value.match(/[\d.]+/g)?.map(Number) ?? [];
  if ([hue, saturation, lightness].every(Number.isFinite)) {
    return new THREE.Color().setHSL((((hue % 360) + 360) % 360) / 360, saturation / 100, lightness / 100);
  }
  return new THREE.Color(fallback);
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
      host.dataset.webgl = 'ready';

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 100);

      const group = new THREE.Group();
      scene.add(group);
      const fragmentGroup = new THREE.Group();
      scene.add(fragmentGroup);

      const primary = readThemeColor('--primary', '#ef2f39');
      const accent = readThemeColor('--accent', '#2979e8');
      const magenta = primary.clone().lerp(new THREE.Color(0xc938ff), 0.48);
      const bridgeColor = primary.clone().lerp(accent, 0.46).multiplyScalar(0.78);

      scene.add(new THREE.AmbientLight(0xffffff, intensity === 'hero' ? 0.54 : 0.48));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
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
      const accentParticleMaterial = new THREE.PointsMaterial({
        color: accent,
        size: intensity === 'hero' ? 0.052 : 0.034,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const primaryParticleMaterial = accentParticleMaterial.clone();
      primaryParticleMaterial.color.copy(primary);

      const radius = intensity === 'hero' ? 1.14 : 0.92;
      const height = intensity === 'hero' ? 5.7 : 5.35;

      const platformMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x242a3a),
        emissive: primary.clone().multiplyScalar(0.13),
        metalness: 0.88,
        roughness: 0.16,
      });
      const platformTopMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x10162a), emissive: magenta.clone().multiplyScalar(0.16), metalness: 0.82, roughness: 0.2,
      });
      const platformPrimaryMaterial = new THREE.MeshBasicMaterial({ color: primary, transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending });
      const platformAccentMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending });
      const platform = new THREE.Group();
      const baseY = -height / 2 - 0.2;
      const platformGeometries: THREE.BufferGeometry[] = [];
      const lowerGeometry = new THREE.CylinderGeometry(radius * 2.1, radius * 2.28, 0.28, 80);
      const upperGeometry = new THREE.CylinderGeometry(radius * 1.78, radius * 1.98, 0.24, 80);
      const topGeometry = new THREE.CylinderGeometry(radius * 1.58, radius * 1.72, 0.1, 80);
      platformGeometries.push(lowerGeometry, upperGeometry, topGeometry);
      const lowerDisc = new THREE.Mesh(lowerGeometry, platformMaterial);
      lowerDisc.position.y = baseY - 0.18;
      const upperDisc = new THREE.Mesh(upperGeometry, platformMaterial);
      upperDisc.position.y = baseY + 0.03;
      const topDisc = new THREE.Mesh(topGeometry, platformTopMaterial);
      topDisc.position.y = baseY + 0.19;
      platform.add(lowerDisc, upperDisc, topDisc);

      [1.52, 1.72, 1.98, 2.2].forEach((ringRadius, ringIndex) => {
        const geometry = new THREE.TorusGeometry(radius * ringRadius, 0.025 + ringIndex * 0.006, 10, 100);
        platformGeometries.push(geometry);
        const ring = new THREE.Mesh(geometry, ringIndex % 2 === 0 ? platformPrimaryMaterial : platformAccentMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = baseY + 0.27 - ringIndex * 0.095;
        platform.add(ring);
      });

      const beamGeometry = new THREE.CylinderGeometry(0.009, 0.015, 1, 5);
      platformGeometries.push(beamGeometry);
      const energyBeams: THREE.Mesh[] = [];
      const beamCount = intensity === 'hero' ? 64 : 36;
      for (let index = 0; index < beamCount; index += 1) {
        const phase = (index / beamCount) * Math.PI * 2;
        const beamRadius = radius * (0.38 + (index % 8) * 0.17);
        const beam = new THREE.Mesh(beamGeometry, index % 2 === 0 ? platformPrimaryMaterial : platformAccentMaterial);
        const beamHeight = 0.22 + ((index * 17) % 13) * 0.055;
        beam.scale.y = beamHeight;
        beam.position.set(Math.cos(phase) * beamRadius, baseY + 0.28 + beamHeight / 2, Math.sin(phase) * beamRadius);
        beam.userData.phase = phase;
        beam.userData.baseHeight = beamHeight;
        energyBeams.push(beam);
        platform.add(beam);
      }
      scene.add(platform);

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
      const leftPath: THREE.Vector3[] = [];
      const rightPath: THREE.Vector3[] = [];

      for (let index = 0; index < points; index += 1) {
        const t = index / (points - 1);
        const y = (t - 0.5) * height;
        const angle = t * Math.PI * 2 * turns;
        const left = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        const right = new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);
        leftPath.push(left);
        rightPath.push(right);

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

      const strandTubeMaterial = new THREE.MeshBasicMaterial({ color: magenta, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending });
      const pairedTubeMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending });
      const leftTubeGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(leftPath), 180, 0.022, 6, false);
      const rightTubeGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rightPath), 180, 0.022, 6, false);
      group.add(new THREE.Mesh(leftTubeGeometry, strandTubeMaterial), new THREE.Mesh(rightTubeGeometry, pairedTubeMaterial));

      const particleCount = intensity === 'hero' ? 360 : 200;
      const createParticleCloud = (side: -1 | 1, material: THREE.PointsMaterial) => {
        const positions = new Float32Array(particleCount * 3);
        for (let index = 0; index < particleCount; index += 1) {
        const orbit = 1.5 + Math.random() * 2.1;
        const angle = Math.random() * Math.PI * 2;
        positions[index * 3] = Math.cos(angle) * orbit + side * 0.34;
        positions[index * 3 + 1] = baseY + Math.pow(Math.random(), 0.72) * (height + 1.4);
        positions[index * 3 + 2] = Math.sin(angle) * orbit;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const pointsCloud = new THREE.Points(geometry, material);
        scene.add(pointsCloud);
        return { geometry, points: pointsCloud };
      };
      const primaryCloud = createParticleCloud(-1, primaryParticleMaterial);
      const accentCloud = createParticleCloud(1, accentParticleMaterial);

      const applyThemeColors = () => {
        primary.copy(readThemeColor('--primary', '#ef2f39'));
        accent.copy(readThemeColor('--accent', '#2979e8'));
        bridgeColor.copy(primary).lerp(accent, 0.46).multiplyScalar(0.78);
        strandMaterial.color.copy(primary);
        strandMaterial.emissive.copy(primary).multiplyScalar(0.3);
        pairedStrandMaterial.color.copy(accent);
        pairedStrandMaterial.emissive.copy(accent).multiplyScalar(0.28);
        rungMaterial.color.copy(bridgeColor);
        magenta.copy(primary).lerp(new THREE.Color(0xc938ff), 0.48);
        accentParticleMaterial.color.copy(accent);
        primaryParticleMaterial.color.copy(primary);
        rimLight.color.copy(primary);
        platformMaterial.emissive.copy(primary).multiplyScalar(0.13);
        platformTopMaterial.emissive.copy(magenta).multiplyScalar(0.16);
        platformPrimaryMaterial.color.copy(primary);
        platformAccentMaterial.color.copy(accent);
        strandTubeMaterial.color.copy(magenta);
        pairedTubeMaterial.color.copy(accent);
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
        const orbitRadius = intensity === 'hero' ? 9.4 : 8.4;

        camera.position.set(Math.sin(orbitAngle) * orbitRadius, 1.18 + Math.sin(orbitAngle * 0.45) * 0.28, Math.cos(orbitAngle) * orbitRadius);
        camera.lookAt(0, -0.58, 0);

        group.rotation.y = reduceMotion ? scrollAngle * 0.2 : time * 0.12 + scrollAngle * 0.38;
        group.rotation.z = Math.sin(time * 0.35) * 0.015;
        primaryCloud.points.rotation.y = reduceMotion ? 0 : -time * 0.035;
        accentCloud.points.rotation.y = reduceMotion ? 0 : time * 0.042;
        platform.rotation.y = reduceMotion ? 0 : time * 0.07;
        energyBeams.forEach((beam) => {
          const pulse = 0.78 + Math.sin(time * 2.1 + (beam.userData.phase as number) * 3) * 0.22;
          beam.scale.y = (beam.userData.baseHeight as number) * pulse;
        });
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
      leftTubeGeometry.dispose();
      rightTubeGeometry.dispose();
      primaryCloud.geometry.dispose();
      accentCloud.geometry.dispose();
      platformGeometries.forEach(geometry => geometry.dispose());
      fragmentGeometry.dispose();
      strandMaterial.dispose();
      pairedStrandMaterial.dispose();
      rungMaterial.dispose();
      accentParticleMaterial.dispose();
      primaryParticleMaterial.dispose();
      platformMaterial.dispose();
      platformTopMaterial.dispose();
      platformPrimaryMaterial.dispose();
      platformAccentMaterial.dispose();
      strandTubeMaterial.dispose();
      pairedTubeMaterial.dispose();
      fragmentMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      delete host.dataset.webgl;
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
