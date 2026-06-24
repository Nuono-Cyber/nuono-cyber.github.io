import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Database, Instagram, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { DnaHelixScene } from '@/components/visuals/DnaHelixScene';

const featureItems = [
  { icon: BarChart3, label: 'Performance', text: 'Visões por alcance, engajamento, formato e período.' },
  { icon: Database, label: 'Dados', text: 'Importação por CSV/Excel com caminho pronto para Meta Graph API.' },
  { icon: ShieldCheck, label: 'Controle', text: 'Acesso protegido e operação administrativa centralizada.' },
];

export default function Welcome() {
  const { user, isLoading } = useAuthContext();

  if (!isLoading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <main className="relative min-h-screen">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_82%_28%,hsl(var(--primary)/0.16),transparent_30%),radial-gradient(circle_at_62%_74%,hsl(var(--accent)/0.1),transparent_28%)]" />

        <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Instagram className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">NAD Analytics</div>
                <div className="text-xs text-muted-foreground">Instagram intelligence</div>
              </div>
            </div>
          </header>

          <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.68fr)] lg:gap-12 lg:py-12">
            <div className="relative z-10 max-w-3xl">
              <Badge variant="outline" className="mb-5 gap-2 border-primary/30 bg-background/50 px-3 py-1 text-xs backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Métricas, conteúdo e crescimento em uma visão executiva
              </Badge>
              <h1 className="max-w-[12ch] text-4xl font-bold leading-[1.05] sm:max-w-[13ch] sm:text-5xl lg:max-w-[13ch] lg:text-6xl xl:text-7xl">
                Análise estratégica para influenciadores que tratam conteúdo como negócio.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                O painel cruza posts, alcance, engajamento, tendências e previsões para transformar arquivos do Instagram em decisões claras. Hoje o fluxo aceita CSV e Excel; a base já está preparada para evoluir para sincronização automática pela Meta.
              </p>
              <div className="mt-8">
                <Button asChild size="lg" className="h-12 gap-2 px-6">
                  <Link to="/auth">
                    Login
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="relative z-0 space-y-5">
              <div className="relative h-[260px] overflow-hidden rounded-lg border border-border/60 bg-card/40 sm:h-[320px] lg:h-[540px]">
                <DnaHelixScene
                  intensity="hero"
                  className="pointer-events-none absolute inset-0 opacity-95"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.08),hsl(var(--background)/0.5))]" />
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {featureItems.map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/70 bg-card/86 p-4 shadow-sm backdrop-blur">
                    <item.icon className="mb-3 h-5 w-5 text-primary" />
                    <div className="text-sm font-semibold">{item.label}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
