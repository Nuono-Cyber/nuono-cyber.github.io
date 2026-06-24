import { useEffect, useRef } from 'react';

function readThemeColor(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `hsl(${value})` : fallback;
}

export function ScrollMetricsScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let cleanup = () => {};
    let isDisposed = false;
    let scrollProgress = 0;
    const updateScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollProgress = window.scrollY / maxScroll;
    };

    import('three').then((THREE) => {
      if (isDisposed || !hostRef.current) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setSize(host.clientWidth, host.clientHeight);
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, host.clientWidth / host.clientHeight, 0.1, 100);
      camera.position.set(0, 0, 9);

      const primary = new THREE.Color(readThemeColor('--primary', 'hsl(0 78% 52%)'));
      const accent = new THREE.Color(readThemeColor('--accent', 'hsl(220 75% 55%)'));
      const muted = new THREE.Color(readThemeColor('--muted-foreground', 'hsl(215 14% 55%)'));

      scene.add(new THREE.AmbientLight(0xffffff, 1.1));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      keyLight.position.set(3, 4, 5);
      scene.add(keyLight);

      const group = new THREE.Group();
      scene.add(group);

      const ringMaterial = new THREE.MeshStandardMaterial({
        color: primary,
        metalness: 0.35,
        roughness: 0.28,
        transparent: true,
        opacity: 0.72,
      });
      const signalMaterial = new THREE.MeshStandardMaterial({
        color: accent,
        metalness: 0.22,
        roughness: 0.32,
        transparent: true,
        opacity: 0.68,
      });
      const cubeMaterial = new THREE.MeshStandardMaterial({
        color: muted,
        metalness: 0.12,
        roughness: 0.42,
        transparent: true,
        opacity: 0.5,
      });

      const ring = new THREE.Mesh(new THREE.TorusKnotGeometry(0.72, 0.18, 96, 14), ringMaterial);
      ring.position.set(2.7, 1.65, 0);
      ring.rotation.set(0.6, 0.3, 0.2);
      group.add(ring);

      const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 1), signalMaterial);
      diamond.position.set(-2.8, -1.2, -0.5);
      diamond.rotation.set(0.4, 0.8, 0);
      group.add(diamond);

      const bars = new THREE.Group();
      [-0.56, 0, 0.56].forEach((x, index) => {
        const height = [0.8, 1.35, 1.05][index];
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.34, height, 0.34), cubeMaterial);
        bar.position.set(x, -0.45 + height / 2, 0);
        bars.add(bar);
      });
      bars.position.set(2.25, -2, -0.2);
      bars.rotation.set(0.15, -0.55, 0.1);
      group.add(bars);

      const resize = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      let frameId = 0;
      const tick = () => {
        const time = performance.now() * 0.001;
        group.rotation.y = scrollProgress * 1.8;
        ring.rotation.x = 0.6 + time * 0.22 + scrollProgress * 2.2;
        ring.rotation.y = 0.3 + time * 0.18;
        diamond.rotation.y = 0.8 - time * 0.26 - scrollProgress * 2.8;
        diamond.position.y = -1.2 + Math.sin(time * 1.2) * 0.08;
        bars.rotation.z = 0.1 + scrollProgress * 0.42;
        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(tick);
      };

      updateScroll();
      resize();
      tick();

      window.addEventListener('scroll', updateScroll, { passive: true });
      window.addEventListener('resize', resize);

      cleanup = () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener('scroll', updateScroll);
        window.removeEventListener('resize', resize);
        ring.geometry.dispose();
        diamond.geometry.dispose();
        bars.children.forEach((child) => {
          if (child instanceof THREE.Mesh) child.geometry.dispose();
        });
        ringMaterial.dispose();
        signalMaterial.dispose();
        cubeMaterial.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      isDisposed = true;
      cleanup();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-20 right-0 z-0 hidden w-[34vw] min-w-[360px] max-w-[620px] opacity-60 lg:block"
    />
  );
}
