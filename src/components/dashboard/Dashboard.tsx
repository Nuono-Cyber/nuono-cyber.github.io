import { useState, useCallback } from 'react';
import { useInstagramData } from '@/hooks/useInstagramData';
import { useAuthContext } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Snowfall } from './Snowfall';
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
import { Loader2, Instagram, Calendar, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const { posts, isLoading, error, summary, addUploadedData, isSaving, refreshData } = useInstagramData();
  const { isSuperAdmin } = useAuthContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [chatBotOpen, setChatBotOpen] = useState(false);
  const [internalChatOpen, setInternalChatOpen] = useState(false);

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
          <p className="text-sm text-muted-foreground">Verifique se o arquivo de dados está disponível.</p>
        </div>
      </div>
    );
  }

  const currentTab = TAB_TITLES[activeTab] || TAB_TITLES.overview;

  const renderContent = () => {
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
        <Snowfall />
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 flex flex-col min-w-0">
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

              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-normal gap-1.5 py-1">
                    <Instagram className="w-3 h-3" />
                    @{posts[0]?.username || 'nadsongl'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-normal gap-1.5 py-1">
                    <BarChart3 className="w-3 h-3" />
                    {posts.length} posts
                  </Badge>
                  {posts.length > 0 && (
                    <Badge variant="outline" className="text-[10px] font-normal gap-1.5 py-1">
                      <Calendar className="w-3 h-3" />
                      {posts[posts.length - 1]?.publishedAt.toLocaleDateString('pt-BR')} — {posts[0]?.publishedAt.toLocaleDateString('pt-BR')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-[1600px] mx-auto">
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
