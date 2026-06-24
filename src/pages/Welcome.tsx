import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Database, Instagram, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { DnaHelixScene } from '@/components/visuals/DnaHelixScene';

export default function Welcome() {
  const { user, isLoading } = useAuthContext();

  if (!isLoading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <main className="relative min-h-screen">
        <DnaHelixScene
          intensity="hero"
          className="pointer-events-none absolute inset-0 z-[1] opacity-95"
        />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_72%_35%,hsl(var(--primary)/0.16),transparent_34%),linear-gradient(90deg,hsl(var(--background))_0%,hsl(var(--background)/0.94)_38%,hsl(var(--background)/0.24)_100%)]" />

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

          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.58fr)] lg:py-16">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-5 gap-2 border-primary/30 bg-background/50 px-3 py-1 text-xs backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Métricas, conteúdo e crescimento em uma visão executiva
              </Badge>
              <h1 className="text-balance text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
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

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: BarChart3, label: 'Performance', text: 'Visões por alcance, engajamento, formato e período.' },
                { icon: Database, label: 'Dados', text: 'Importação por CSV/Excel com caminho pronto para Meta Graph API.' },
                { icon: ShieldCheck, label: 'Controle', text: 'Acesso protegido e operação administrativa centralizada.' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border/70 bg-card/78 p-4 shadow-sm backdrop-blur">
                  <item.icon className="mb-3 h-5 w-5 text-primary" />
                  <div className="text-sm font-semibold">{item.label}</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
