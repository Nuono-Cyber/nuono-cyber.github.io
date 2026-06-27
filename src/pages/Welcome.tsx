import { Link, Navigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, BarChart3, Database, Menu, Play, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { DnaHelixScene } from '@/components/visuals/DnaHelixScene';
import { BrandMark } from '@/components/BrandMark';

const featureItems = [
  { icon: BarChart3, label: 'Performance', text: 'Visão completa de alcance, engajamento e formato por período.', tone: 'primary' },
  { icon: Database, label: 'Dados', text: 'Importação por CSV/Excel e integrações com Meta Graph API.', tone: 'primary' },
  { icon: ShieldCheck, label: 'Controle', text: 'Operação centralizada e acesso seguro para sua equipe.', tone: 'accent' },
  { icon: TrendingUp, label: 'Tendências', text: 'Identifique padrões, antecipe movimentos e tome decisões antes.', tone: 'violet' },
];

export default function Welcome() {
  const { user, isLoading } = useAuthContext();

  if (!isLoading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="welcome-page min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="welcome-header">
        <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <BrandMark />
          <nav className="hidden items-center gap-10 text-sm font-semibold lg:flex" aria-label="Navegação principal">
            <a href="#produto">Produto</a><a href="#recursos">Recursos</a><a href="#recursos">Preços</a>
            <Button variant="outline" className="h-11 px-6" asChild><a href="#produto">Ver demo</a></Button>
            <Button className="h-11 px-7 shadow-[0_0_30px_hsl(var(--primary)/0.3)]" asChild><Link to="/auth">Entrar</Link></Button>
          </nav>
          <Button variant="outline" size="icon" className="h-11 w-11 lg:hidden" aria-label="Abrir menu"><Menu className="h-5 w-5" /></Button>
        </div>
      </header>

      <main id="produto" className="relative">
        <div className="welcome-grid" />
        <section className="relative z-10 mx-auto grid min-h-[calc(100vh-76px)] w-full max-w-[1440px] items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-12 lg:py-10">
            <div className="relative z-10 max-w-[620px]">
              <Badge variant="outline" className="mb-6 gap-2 rounded-full border-primary/55 bg-background/60 px-4 py-1.5 text-xs backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Métricas, conteúdo e crescimento em uma visão executiva
              </Badge>
              <h1 className="welcome-title">
                Análise <span className="gradient-text">estratégica</span> para influenciadores que tratam conteúdo como negócio.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Centralize posts, alcance, engajamento, tendências e previsões para transformar dados do Instagram em decisões claras, rápido e pronto para ação.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-[52px] gap-8 px-8 shadow-[0_0_30px_hsl(var(--primary)/0.28)]"><Link to="/auth">Entrar <ArrowRight className="h-4 w-4" /></Link></Button>
                <Button asChild variant="outline" size="lg" className="h-[52px] gap-3 px-7"><a href="#recursos"><Play className="h-4 w-4 text-primary" />Ver demonstração</a></Button>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span>Importação por CSV/Excel hoje</span><span className="h-1 w-1 rounded-full bg-primary" /><span>Estrutura pronta para Meta Graph API</span>
              </div>
            </div>

            <div className="relative z-0" id="recursos">
              <div className="dna-showcase">
                <DnaHelixScene intensity="hero" className="pointer-events-none absolute inset-0 opacity-100" />
                <div className="dna-stat dna-stat-reach"><span>Alcance</span><strong>+24,6%</strong></div>
                <div className="dna-stat dna-stat-engagement"><span>Engajamento</span><strong>+38,1%</strong></div>
                <div className="dna-stat dna-stat-conversion"><span>Conversão</span><strong>+18,7%</strong></div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {featureItems.map((item) => (
                  <div key={item.label} className="feature-tile">
                    <div className={`feature-icon feature-icon-${item.tone}`}><item.icon className="h-5 w-5" /></div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          <a href="#recursos" className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-xs text-muted-foreground lg:flex"><ArrowDown className="h-4 w-4 text-primary" />Explore o poder dos seus dados</a>
        </section>
      </main>
    </div>
  );
}
