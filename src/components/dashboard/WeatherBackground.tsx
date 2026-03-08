import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cloud, CloudRain, Snowflake, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type WeatherEffect = 'snow' | 'rain' | 'none';

interface WeatherBackgroundProps {
  effect: WeatherEffect;
  onEffectChange: (effect: WeatherEffect) => void;
}

function WeatherCanvas({ effect }: { effect: WeatherEffect }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || effect === 'none') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: { x: number; y: number; r: number; speed: number; wind: number; opacity: number; length?: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const createParticles = () => {
      const count = effect === 'rain'
        ? Math.floor((canvas.width * canvas.height) / 6000)
        : Math.floor((canvas.width * canvas.height) / 14000);

      particles = Array.from({ length: count }, () => {
        if (effect === 'rain') {
          return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: 1,
            speed: Math.random() * 4 + 3,
            wind: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.3 + 0.1,
            length: Math.random() * 12 + 6,
          };
        }
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 2.5 + 0.5,
          speed: Math.random() * 0.6 + 0.2,
          wind: Math.random() * 0.4 - 0.2,
          opacity: Math.random() * 0.35 + 0.08,
        };
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        if (effect === 'rain') {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.wind * 2, p.y + (p.length || 10));
          ctx.strokeStyle = `rgba(174, 194, 224, ${p.opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          p.y += p.speed;
          p.x += p.wind;
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
          ctx.fill();

          p.y += p.speed;
          p.x += p.wind + Math.sin(p.y * 0.01) * 0.3;
        }

        if (p.y > canvas.height) {
          p.y = -(p.length || p.r);
          p.x = Math.random() * canvas.width;
        }
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    createParticles();
    draw();

    const onResize = () => { resize(); createParticles(); };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
    };
  }, [effect]);

  if (effect === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity: 0.6 }}
    />
  );
}

export function WeatherBackground({ effect, onEffectChange }: WeatherBackgroundProps) {
  return <WeatherCanvas effect={effect} />;
}

export function WeatherToggle({ effect, onEffectChange }: WeatherBackgroundProps) {
  const [showMenu, setShowMenu] = useState(false);

  const options: { value: WeatherEffect; icon: typeof Snowflake; label: string }[] = [
    { value: 'snow', icon: Snowflake, label: 'Neve' },
    { value: 'rain', icon: CloudRain, label: 'Chuva' },
    { value: 'none', icon: X, label: 'Desativar' },
  ];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowMenu(!showMenu)}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Efeito de clima"
      >
        <Cloud className="h-4 w-4" />
      </Button>

      {showMenu && (
        <div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onEffectChange(opt.value); setShowMenu(false); }}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs transition-colors',
                effect === opt.value
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
