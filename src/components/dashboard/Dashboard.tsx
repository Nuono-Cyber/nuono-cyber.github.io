import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInstagramData } from '@/hooks/useInstagramData';
import { useAuthContext } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { 
  LayoutDashboard, 
  BarChart3, 
  Clock, 
  FileVideo, 
  Lightbulb,
  Instagram,
  Loader2,
  User,
  LogOut,
  Shield,
  Heart,
  TrendingUp,
  Target,
  LineChart,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

export function Dashboard() {
  const navigate = useNavigate();
  const { posts, isLoading, error, summary, addUploadedData } = useInstagramData();
  const { user, isSuperAdmin, signOut } = useAuthContext();
  const [activeTab, setActiveTab] = useState('overview');

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Erro ao sair');
    } else {
      toast.success('Até logo!');
      navigate('/auth');
    }
  };

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
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                <span>{posts.length} posts analisados</span>
                <span>•</span>
                <span>
                  {posts.length > 0 && `${posts[posts.length - 1]?.publishedAt.toLocaleDateString('pt-BR')} - ${posts[0]?.publishedAt.toLocaleDateString('pt-BR')}`}
                </span>
              </div>
              
              <ThemeSwitcher />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <User className="h-5 w-5" />
                    {isSuperAdmin && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-card">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {isSuperAdmin ? 'Super Administrador' : 'Usuário'}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  {isSuperAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Painel Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/activity')}>
                        <Activity className="mr-2 h-4 w-4" />
                        Logs de Atividade
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-card p-1 h-auto flex-wrap justify-start gap-1">
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
              <span className="hidden sm:inline">Temporal</span>
            </TabsTrigger>
            <TabsTrigger 
              value="content" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <FileVideo className="w-4 h-4" />
              <span className="hidden sm:inline">Conteúdo</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sentiment" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Sentimento</span>
            </TabsTrigger>
            <TabsTrigger 
              value="prediction" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Previsões</span>
            </TabsTrigger>
            <TabsTrigger 
              value="benchmark" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Benchmark</span>
            </TabsTrigger>
            <TabsTrigger 
              value="trends" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <LineChart className="w-4 h-4" />
              <span className="hidden sm:inline">Tendências</span>
            </TabsTrigger>
            <TabsTrigger 
              value="insights" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger 
                value="data" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Dados</span>
              </TabsTrigger>
            )}
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

          <TabsContent value="sentiment" className="mt-0">
            <SentimentTab posts={posts} />
          </TabsContent>

          <TabsContent value="prediction" className="mt-0">
            <PredictionTab posts={posts} />
          </TabsContent>

          <TabsContent value="benchmark" className="mt-0">
            <BenchmarkTab posts={posts} />
          </TabsContent>

          <TabsContent value="trends" className="mt-0">
            <TrendsTab posts={posts} />
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <InsightsTab posts={posts} />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="data" className="mt-0">
              <DataUpload onDataUploaded={addUploadedData} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Dashboard de Analytics • Dados processados com análise avançada</p>
        </div>
      </footer>

      {/* ChatBot */}
      <ChatBot posts={posts} summary={summary} />
    </div>
  );
}
