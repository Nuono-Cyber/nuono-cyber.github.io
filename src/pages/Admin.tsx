import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Copy, 
  Loader2, 
  Plus, 
  Trash2, 
  Users,
  Shield,
  Key,
  RefreshCw,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { generateHexCode, formatHexCode } from '@/utils/inviteCodeGenerator';

interface Invite {
  id: string;
  token: string;
  code: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { isSuperAdmin, user } = useAuthContext();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isSuperAdmin, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: invitesData, error: invitesError } = await supabase
        .from('invites')
        .select('id, token, code, used_at, expires_at, created_at')
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;
      setInvites(invitesData || []);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const usersWithRoles: UserProfile[] = [];
      for (const profile of profilesData || []) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.user_id)
          .maybeSingle();
        
        usersWithRoles.push({
          id: profile.user_id,
          email: profile.email,
          full_name: profile.full_name,
          created_at: profile.created_at,
          role: roleData?.role || 'user',
        });
      }
      setUsers(usersWithRoles);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createInviteCode = async () => {
    setIsCreating(true);
    try {
      const code = generateHexCode();
      const { data, error } = await supabase
        .from('invites')
        .insert({
          invited_by: user?.id,
          code: code,
        })
        .select()
        .single();

      if (error) throw error;

      setInvites([data, ...invites]);
      await navigator.clipboard.writeText(formatHexCode(code));
      toast.success(`Código ${formatHexCode(code)} gerado e copiado!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(formatHexCode(code));
    toast.success('Código copiado!');
  };

  const deleteInvite = async (id: string) => {
    try {
      const { error } = await supabase.from('invites').delete().eq('id', id);
      if (error) throw error;
      setInvites(invites.filter(i => i.id !== id));
      toast.success('Código excluído');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isInviteValid = (invite: Invite) => {
    return !invite.used_at && new Date(invite.expires_at) > new Date();
  };

  const getStatusInfo = (invite: Invite) => {
    if (invite.used_at) {
      return { label: 'Utilizado', variant: 'secondary' as const, icon: CheckCircle2, color: 'text-muted-foreground' };
    }
    if (new Date(invite.expires_at) <= new Date()) {
      return { label: 'Expirado', variant: 'destructive' as const, icon: XCircle, color: 'text-destructive' };
    }
    return { label: 'Disponível', variant: 'default' as const, icon: Sparkles, color: 'text-[hsl(var(--success))]' };
  };

  const stats = {
    total: invites.length,
    available: invites.filter(i => isInviteValid(i)).length,
    used: invites.filter(i => i.used_at).length,
    expired: invites.filter(i => !i.used_at && new Date(i.expires_at) <= new Date()).length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl instagram-gradient animate-pulse" />
            <Loader2 className="w-8 h-8 animate-spin text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/')}
                className="rounded-xl hover:bg-secondary"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl instagram-gradient shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Central de Controle</h1>
                  <p className="text-sm text-muted-foreground">Gerenciamento de acessos</p>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="gap-2 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="metric-card group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Hash className="w-4 h-4 text-primary" />
              </div>
              <span className="text-2xl font-bold mono-text">{stats.total}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total de Códigos</p>
          </div>
          
          <div className="metric-card group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-[hsl(var(--success))]/10">
                <Sparkles className="w-4 h-4 text-[hsl(var(--success))]" />
              </div>
              <span className="text-2xl font-bold mono-text text-[hsl(var(--success))]">{stats.available}</span>
            </div>
            <p className="text-sm text-muted-foreground">Disponíveis</p>
          </div>
          
          <div className="metric-card group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-secondary">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-2xl font-bold mono-text">{stats.used}</span>
            </div>
            <p className="text-sm text-muted-foreground">Utilizados</p>
          </div>
          
          <div className="metric-card group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Clock className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-2xl font-bold mono-text text-destructive">{stats.expired}</span>
            </div>
            <p className="text-sm text-muted-foreground">Expirados</p>
          </div>
        </div>

        {/* Generate Code Section */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
          <div className="absolute inset-0 instagram-gradient opacity-5" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
                <Key className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Gerar Novo Código</h2>
                <p className="text-sm text-muted-foreground">Crie um código hexadecimal único para novos usuários</p>
              </div>
            </div>
            <Button 
              onClick={createInviteCode} 
              disabled={isCreating}
              className="gap-2 instagram-gradient text-white shadow-lg hover:opacity-90 transition-opacity rounded-xl px-6"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Gerar Código
            </Button>
          </div>
        </div>

        {/* Codes List */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <Key className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Códigos de Convite</h2>
                <p className="text-sm text-muted-foreground">{invites.length} código(s) no sistema</p>
              </div>
            </div>
          </div>

          {invites.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-secondary mb-4">
                <Key className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nenhum código gerado ainda</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Clique em "Gerar Código" para criar o primeiro</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invites.map((invite) => {
                const status = getStatusInfo(invite);
                const StatusIcon = status.icon;
                
                return (
                  <div 
                    key={invite.id} 
                    className="p-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`p-2.5 rounded-xl ${
                          status.variant === 'default' ? 'bg-[hsl(var(--success))]/10' : 
                          status.variant === 'destructive' ? 'bg-destructive/10' : 
                          'bg-secondary'
                        }`}>
                          <StatusIcon className={`w-4 h-4 ${status.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-lg tracking-wider truncate">
                            {invite.code ? formatHexCode(invite.code) : '—'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>Criado: {new Date(invite.created_at).toLocaleDateString('pt-BR')}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                            <span>Expira: {new Date(invite.expires_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={status.variant}
                          className="rounded-lg px-3"
                        >
                          {status.label}
                        </Badge>
                        
                        {invite.code && isInviteValid(invite) && (
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => copyCode(invite.code!)}
                            className="rounded-xl h-9 w-9 hover:bg-primary/10 hover:text-primary"
                            title="Copiar código"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {!invite.used_at && (
                          <Button 
                            size="icon" 
                            variant="ghost"
                            className="rounded-xl h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => deleteInvite(invite.id)}
                            title="Excluir código"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Users List */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Usuários do Sistema</h2>
                <p className="text-sm text-muted-foreground">{users.length} usuário(s) cadastrado(s)</p>
              </div>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-secondary mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nenhum usuário cadastrado ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div 
                  key={u.id} 
                  className="p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
                        <span className="text-sm font-semibold text-primary">
                          {(u.full_name || u.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {u.full_name || <span className="text-muted-foreground italic">Sem nome</span>}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={`rounded-lg px-3 ${
                          u.role === 'super_admin' 
                            ? 'instagram-gradient text-white border-0' 
                            : u.role === 'admin' 
                              ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' 
                              : ''
                        }`}
                        variant={u.role === 'user' ? 'secondary' : 'default'}
                      >
                        {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
