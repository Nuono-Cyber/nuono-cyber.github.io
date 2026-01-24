import { useState } from 'react';
import { useInstagramData } from '@/hooks/useInstagramData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from './tabs/OverviewTab';
import { EngagementTab } from './tabs/EngagementTab';
import { TemporalTab } from './tabs/TemporalTab';
import { ContentTab } from './tabs/ContentTab';
import { InsightsTab } from './tabs/InsightsTab';
import { 
  LayoutDashboard, 
  BarChart3, 
  Clock, 
  FileVideo, 
  Lightbulb,
  Instagram,
  Loader2
} from 'lucide-react';

export function Dashboard() {
  const { posts, isLoading, error, summary } = useInstagramData();
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando dados do Instagram...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8 rounded-xl bg-destructive/10 border border-destructive/30">
          <p className="text-destructive font-medium">{error}</p>
          <p className="text-sm text-muted-foreground">Verifique se o arquivo de dados está disponível.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl instagram-gradient">
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Instagram Analytics</h1>
                <p className="text-sm text-muted-foreground">@{posts[0]?.username || 'nadsongl'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{posts.length} posts analisados</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">
                {posts.length > 0 && `${posts[posts.length - 1]?.publishedAt.toLocaleDateString('pt-BR')} - ${posts[0]?.publishedAt.toLocaleDateString('pt-BR')}`}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 p-1 h-auto flex-wrap justify-start gap-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger 
              value="engagement" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Engajamento</span>
            </TabsTrigger>
            <TabsTrigger 
              value="temporal" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Análise Temporal</span>
            </TabsTrigger>
            <TabsTrigger 
              value="content" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <FileVideo className="w-4 h-4" />
              <span className="hidden sm:inline">Conteúdo</span>
            </TabsTrigger>
            <TabsTrigger 
              value="insights" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <OverviewTab posts={posts} summary={summary} />
          </TabsContent>

          <TabsContent value="engagement" className="mt-0">
            <EngagementTab posts={posts} />
          </TabsContent>

          <TabsContent value="temporal" className="mt-0">
            <TemporalTab posts={posts} />
          </TabsContent>

          <TabsContent value="content" className="mt-0">
            <ContentTab posts={posts} />
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <InsightsTab posts={posts} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Dashboard de Analytics • Dados processados com análise avançada</p>
        </div>
      </footer>
    </div>
  );
}
