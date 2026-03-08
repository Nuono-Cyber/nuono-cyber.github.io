import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  LayoutDashboard, BarChart3, Clock, FileVideo, Heart,
  TrendingUp, Target, LineChart, Lightbulb, Shield, Activity,
  Instagram, LogOut, ChevronLeft, Settings, UserPlus
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarFooter, SidebarHeader, useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const analyticsItems = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'engagement', label: 'Engajamento', icon: BarChart3 },
  { id: 'temporal', label: 'Temporal', icon: Clock },
  { id: 'content', label: 'Conteúdo', icon: FileVideo },
  { id: 'sentiment', label: 'Sentimento', icon: Heart },
  { id: 'prediction', label: 'Previsões', icon: TrendingUp },
  { id: 'benchmark', label: 'Benchmark', icon: Target },
  { id: 'trends', label: 'Tendências', icon: LineChart },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
];

const adminItems = [
  { id: 'data', label: 'Importar Dados', icon: Settings },
];

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, isSuperAdmin, signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) { toast.error('Erro ao sair'); }
    else { toast.success('Até logo!'); navigate('/auth'); }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 shrink-0">
            <Instagram className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold truncate text-sidebar-foreground">NAD Analytics</h1>
              <p className="text-[10px] text-muted-foreground truncate">Enterprise Dashboard</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
            {!collapsed ? 'Analytics' : ''}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      'w-full transition-all duration-200',
                      activeTab === item.id
                        ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                        : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                    )}
                    tooltip={collapsed ? item.label : undefined}
                  >
                    <item.icon className={cn('h-4 w-4 shrink-0', activeTab === item.id ? 'text-primary' : '')} />
                    {!collapsed && <span className="text-sm">{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
              {!collapsed ? 'Administração' : ''}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        'w-full transition-all duration-200',
                        activeTab === item.id
                          ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                          : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                      )}
                      tooltip={collapsed ? item.label : undefined}
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', activeTab === item.id ? 'text-primary' : '')} />
                      {!collapsed && <span className="text-sm">{item.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin')}
                    className="hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                    tooltip={collapsed ? 'Painel Admin' : undefined}
                  >
                    <Shield className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-sm">Painel Admin</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/activity')}
                    className="hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                    tooltip={collapsed ? 'Logs' : undefined}
                  >
                    <Activity className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-sm">Logs de Atividade</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/admin/invites')}
                    className="hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                    tooltip={collapsed ? 'Convites' : undefined}
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-sm">Convites</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-medium truncate text-sidebar-foreground">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground">
                  {isSuperAdmin ? 'Super Admin' : 'Usuário'}
                </p>
              </div>
              <ThemeSwitcher />
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair da conta
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ThemeSwitcher />
            <button onClick={handleSignOut} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
