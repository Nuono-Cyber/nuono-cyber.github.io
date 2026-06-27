import { useState, useCallback } from 'react';
import { useInstagramData } from '@/hooks/useInstagramData';
import { useAuthContext } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
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
import { InternalChat } from '@/components/chat/InternalChat';
import { Loader2, Instagram, Calendar, LogOut, RefreshCw, Download, Bell, ChevronDown, Home, FileVideo, Plus, Users, Menu, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '@/components/BrandMark';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { cn } from '@/lib/utils';

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

function MobileNavigation({ activeTab, onTabChange, canImport }: { activeTab: string; onTabChange: (tab: string) => void; canImport: boolean }) {
  const { toggleSidebar } = useSidebar();
  return (
    <nav className="mobile-bottom-nav" aria-label="Navegação do painel">
      {[
        { id: 'overview', label: 'Resumo', icon: Home },
        { id: 'content', label: 'Conteúdo', icon: FileVideo },
      ].map(item => <button key={item.id} onClick={() => onTabChange(item.id)} className={cn(activeTab === item.id && 'active')}><item.icon /><span>{item.label}</span></button>)}
      <button className="mobile-add" onClick={() => onTabChange(canImport ? 'data' : 'insights')} aria-label="Adicionar dados"><Plus /></button>
      <button onClick={() => onTabChange('engagement')} className={cn(activeTab === 'engagement' && 'active')}><Users /><span>Audiência</span></button>
      <button type="button" onClick={toggleSidebar}><Menu /><span>Menu</span></button>
    </nav>
  );
}

export function Dashboard({ demoMode = false }: { demoMode?: boolean }) {
  const {
    posts,
    isLoading,
    error,
    summary,
    addUploadedData,
    restoreBaseData,
    isSaving,
    refreshData,
    totalAvailable,
    lastLoadedAt,
    sessionSample,
  } = useInstagramData({ demoMode });
  const { user, isSuperAdmin, signOut } = useAuthContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [chatBotOpen, setChatBotOpen] = useState(false);
  const [internalChatOpen, setInternalChatOpen] = useState(false);
  const [weatherEffect, setWeatherEffect] = useState<'snow' | 'rain' | 'none'>('none');

  const handleChatBotOpenChange = useCallback((open: boolean) => {
    setChatBotOpen(open);
    if (open) setInternalChatOpen(false);
  }, []);

  const handleInternalChatOpenChange = useCallback((open: boolean) => {
    setInternalChatOpen(open);
    if (open) setChatBotOpen(false);
  }, []);

  const handleLogout = async () => {
    if (demoMode) {
      navigate('/welcome');
      return;
    }
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
        <DataUpload
          onDataUploaded={addUploadedData}
          isSaving={isSaving}
          totalRecords={posts.length}
          onRefresh={refreshData}
          sessionSample={sessionSample}
          onRestoreBase={restoreBaseData}
        />
      ) : null;
      default: return <OverviewTab posts={posts} summary={summary} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full bg-background">
        <WeatherBackground effect={weatherEffect} onEffectChange={setWeatherEffect} />
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} demoMode={demoMode} />

        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <header className="dashboard-header">
            <div className="flex h-[72px] items-center justify-between gap-4 px-4 md:px-6">
              <div className="hidden min-w-0 items-center gap-3 md:flex">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                <div>
                  <h1 className="truncate text-xl font-bold">{demoMode ? 'Explore a demonstração' : `Olá, ${user?.email?.split('@')[0] === 'gabrielnbn' ? 'Gabriel' : 'Nadson'}!`}</h1>
                  <p className="truncate text-[11px] text-muted-foreground">{currentTab.description} de @{posts[0]?.username || 'nadsongl'}</p>
                </div>
              </div>
              <BrandMark className="md:hidden" />

              <div className="flex items-center gap-2">
                {demoMode && <Badge className="hidden gap-1.5 border-primary/30 bg-primary/10 text-primary md:flex"><Sparkles className="h-3 w-3" />Modo demo</Badge>}
                <WeatherToggle effect={weatherEffect} onEffectChange={setWeatherEffect} />
                <div className="hidden items-center gap-2 lg:flex">
                  <Badge variant="outline" className="h-10 gap-2 px-4 text-[11px] font-normal">
                    <Instagram className="w-3 h-3" />
                    @{posts[0]?.username || 'nadsongl'}
                    <ChevronDown className="h-3 w-3" />
                  </Badge>
                  {posts.length > 0 && (
                    <Badge variant="outline" className="h-10 gap-2 px-4 text-[11px] font-normal">
                      <Calendar className="w-3 h-3" />
                      {posts[posts.length - 1]?.publishedAt.toLocaleDateString('pt-BR')} — {posts[0]?.publishedAt.toLocaleDateString('pt-BR')}
                      <ChevronDown className="h-3 w-3" />
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" className="h-10 gap-2"><Download className="h-4 w-4" />Exportar</Button>
                </div>
                <ThemeSwitcher />
                <Button variant="ghost" size="icon" className="relative hidden md:inline-flex"><Bell className="h-4 w-4" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" /></Button>
                <Button variant="ghost" size="icon" onClick={handleLogout} aria-label={demoMode ? 'Sair da demonstração' : 'Sair'}><LogOut className="w-4 h-4" /></Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-3 pb-24 sm:p-4 md:p-5 md:pb-5">
            <div className="mx-auto max-w-[1680px]">
              <div className="mb-3 flex items-end justify-between gap-3 md:hidden">
                <div><h1 className="text-xl font-bold">{demoMode ? 'Demonstração interativa' : `Olá, ${user?.email?.split('@')[0] === 'gabrielnbn' ? 'Gabriel' : 'Nadson'}!`}</h1><p className="mt-1 text-xs text-muted-foreground">{currentTab.description}</p></div>
                <Button variant="outline" size="sm" className="h-9 gap-2"><Calendar className="h-4 w-4" />Período</Button>
              </div>
              <div className="mb-3 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                <span>{posts.length} de {totalAvailable || posts.length} registros analisados{lastLoadedAt ? ` · atualizado às ${lastLoadedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                <Button variant="ghost" size="sm" onClick={refreshData} className="h-7 gap-1.5 text-[10px]">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar
                </Button>
              </div>
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      <MobileNavigation activeTab={activeTab} onTabChange={setActiveTab} canImport={!demoMode && isSuperAdmin} />

      {/* Floating Elements */}
      <InternalChat isOpen={internalChatOpen} onOpenChange={handleInternalChatOpenChange} />
      <ChatBot isOpen={chatBotOpen} onOpenChange={handleChatBotOpenChange} posts={posts} />
    </SidebarProvider>
  );
}
