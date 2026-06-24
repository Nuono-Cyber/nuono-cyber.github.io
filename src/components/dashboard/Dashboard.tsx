import { useState, useCallback } from 'react';
import { useInstagramData } from '@/hooks/useInstagramData';
import { useAuthContext } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { WeatherBackground, WeatherToggle } from './WeatherBackground';
import { OverviewTab } from './tabs/OverviewTab';
import { EngagementTab } from './tabs/EngagementTab';
import { TemporalTab } from './tabs/TemporalTab';
import { ContentTab } from './tabs/ContentTab';
import { InsightsTab } from './tabs/InsightsTab';
import { SentimentTab } from './tabs/SentimentTab';
import { PredictionTab } from './tabs/PredictionTab';
import { BenchmarkTab } from './tabs/BenchmarkTab';
import { TrendsTab } from './tabs/TrendsTab';
import { ChatBot } from './ChatBot';
import { DataUpload } from './DataUpload';
import { DnaHelixScene } from '@/components/visuals/DnaHelixScene';
import { InternalChat } from '@/components/chat/InternalChat';
import { Loader2, Instagram, Calendar, BarChart3, LogOut, RefreshCw, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TAB_TITLES: Record<string, { title: string; description: string }> = {
  overview: { title: 'Visão Geral', description: 'Resumo completo de performance' },
  engagement: { title: 'Engajamento', description: 'Análise de interações e conversões' },
  temporal: { title: 'Análise Temporal', description: 'Performance por dia, hora e período' },
  content: { title: 'Conteúdo', description: 'Performance por tipo de conteúdo' },
  sentiment: { title: 'Sentimento', description: 'Análise de tom e linguagem' },
  prediction: { title: 'Previsões', description: 'Modelos preditivos de performance' },
  benchmark: { title: 'Benchmark', description: 'Comparação com padrões do mercado' },
  trends: { title: 'Tendências', description: 'Evolução e padrões temporais' },
  insights: { title: 'Insights', description: 'Recomendações estratégicas automáticas' },
  data: { title: 'Importar Dados', description: 'Upload e sincronização de dados' },
};

export function Dashboard() {
  const {
    posts,
    isLoading,
    error,
    summary,
    addUploadedData,
    isSaving,
    refreshData,
    totalAvailable,
    isLimited,
    lastLoadedAt,
  } = useInstagramData();
  const { isSuperAdmin, signOut } = useAuthContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [chatBotOpen, setChatBotOpen] = useState(false);
  const [internalChatOpen, setInternalChatOpen] = useState(false);
  const [weatherEffect, setWeatherEffect] = useState<'snow' | 'rain' | 'none'>('snow');

  const handleLogout = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
          <div>
            <p className="font-medium text-foreground">Carregando dashboard</p>
            <p className="text-sm text-muted-foreground mt-1">Processando dados do Instagram...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8 rounded-xl bg-destructive/10 border border-destructive/30 max-w-md">
          <p className="text-destructive font-medium">{error}</p>
          <p className="text-sm text-muted-foreground">Verifique se o backend publicado e o Supabase estão respondendo.</p>
          <Button variant="outline" onClick={refreshData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const currentTab = TAB_TITLES[activeTab] || TAB_TITLES.overview;

  const renderContent = () => {
    if (posts.length === 0 && activeTab !== 'data') {
      return (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="font-medium text-foreground">Nenhum dado importado</p>
          <p className="text-sm text-muted-foreground mt-2">
            Importe dados pelo painel administrativo para habilitar as análises.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview': return <OverviewTab posts={posts} summary={summary} />;
      case 'engagement': return <EngagementTab posts={posts} />;
      case 'temporal': return <TemporalTab posts={posts} />;
      case 'content': return <ContentTab posts={posts} />;
      case 'sentiment': return <SentimentTab posts={posts} />;
      case 'prediction': return <PredictionTab posts={posts} />;
      case 'benchmark': return <BenchmarkTab posts={posts} />;
      case 'trends': return <TrendsTab posts={posts} />;
      case 'insights': return <InsightsTab posts={posts} />;
      case 'data': return isSuperAdmin ? (
        <DataUpload onDataUploaded={addUploadedData} isSaving={isSaving} totalRecords={posts.length} onRefresh={refreshData} />
      ) : null;
      default: return <OverviewTab posts={posts} summary={summary} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative">
        <WeatherBackground effect={weatherEffect} onEffectChange={setWeatherEffect} />
        <DnaHelixScene
          scrollLinked
          className="pointer-events-none fixed inset-y-20 right-0 z-0 hidden w-[34vw] min-w-[360px] max-w-[620px] opacity-55 lg:block"
        />
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          {/* Enterprise Header */}
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
            <div className="flex items-center justify-between px-6 h-14">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                <div className="h-6 w-px bg-border" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">{currentTab.title}</h2>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-none mt-0.5">{currentTab.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <WeatherToggle effect={weatherEffect} onEffectChange={setWeatherEffect} />
                <div className="hidden md:flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-normal gap-1.5 py-1">
                    <Instagram className="w-3 h-3" />
                    @{posts[0]?.username || 'nadsongl'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-normal gap-1.5 py-1">
                    <BarChart3 className="w-3 h-3" />
                    {posts.length} posts
                  </Badge>
                  <Badge variant={isLimited ? 'secondary' : 'outline'} className="text-[10px] font-normal gap-1.5 py-1">
                    <Database className="w-3 h-3" />
                    {isLimited ? `${posts.length}/${totalAvailable}` : `${totalAvailable || posts.length}`} registros
                  </Badge>
                  {posts.length > 0 && (
                    <Badge variant="outline" className="text-[10px] font-normal gap-1.5 py-1">
                      <Calendar className="w-3 h-3" />
                      {posts[posts.length - 1]?.publishedAt.toLocaleDateString('pt-BR')} — {posts[0]?.publishedAt.toLocaleDateString('pt-BR')}
                    </Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  Sair
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-[1600px] mx-auto">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {posts.length > 0
                    ? `Dados carregados: ${posts.length}${isLimited ? ` de ${totalAvailable}` : ''} posts disponíveis para análise.`
                    : 'Nenhum post carregado ainda.'}
                  {lastLoadedAt ? ` Atualizado às ${lastLoadedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` : ''}
                </span>
                <Button variant="ghost" size="sm" onClick={refreshData} className="h-8 gap-2">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar
                </Button>
              </div>
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {/* Floating Elements */}
      <InternalChat isOpen={internalChatOpen} onOpenChange={setInternalChatOpen} otherIsOpen={chatBotOpen} />
      <ChatBot isOpen={chatBotOpen} onOpenChange={setChatBotOpen} otherIsOpen={internalChatOpen} />
    </SidebarProvider>
  );
}
