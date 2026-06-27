import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  LayoutDashboard, BarChart3, Clock, FileVideo, Heart,
  TrendingUp, Target, LineChart, Lightbulb, Shield, Activity,
  Settings
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { BrandMark } from '@/components/BrandMark';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarFooter, SidebarHeader, useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

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
  const { user, isSuperAdmin } = useAuthContext();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar/95">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <BrandMark compact={collapsed} />
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="pt-4">
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
                      'h-10 w-full rounded-md transition-all duration-200',
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-primary/30 to-accent/20 text-foreground font-semibold border border-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.12)]'
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="mb-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Perfil analisado</p>
              <p className="mt-1 truncate text-xs font-semibold">@{user?.email?.split('@')[0] || 'influenciador'}</p>
              <p className="mt-2 text-[10px] text-success">Base sincronizada</p>
            </div>
            <div className="flex items-center gap-2 px-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
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
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ThemeSwitcher />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
