import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, isSupabaseClientConfigured } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle2, Loader2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: string;
  must_change_password?: boolean;
}

type FrontendSupabaseStatus = {
  state: 'idle' | 'loading' | 'ok' | 'warning' | 'error';
  title: string;
  description: string;
};

export default function Admin() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuthContext();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [frontendSupabaseStatus, setFrontendSupabaseStatus] = useState<FrontendSupabaseStatus>({
    state: 'idle',
    title: 'Aguardando verificação',
    description: 'O painel ainda não validou as variáveis públicas do Supabase.',
  });

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/');
      return;
    }
    fetchUsers();
    void verifyFrontendSupabase();
  }, [isSuperAdmin, navigate]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const usersResp = await api.users.listAdmin();
      setUsers((usersResp.rows || []) as UserProfile[]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyFrontendSupabase = async () => {
    if (!isSupabaseClientConfigured || !supabase) {
      setFrontendSupabaseStatus({
        state: 'error',
        title: 'Frontend sem credenciais do Supabase',
        description: 'Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente do frontend.',
      });
      return;
    }

    setFrontendSupabaseStatus({
      state: 'loading',
      title: 'Verificando conexão do frontend',
      description: 'Testando comunicação com o projeto Supabase usando a publishable key.',
    });

    const { error, count } = await supabase
      .from('instagram_posts')
      .select('id', { head: true, count: 'exact' });

    if (!error) {
      setFrontendSupabaseStatus({
        state: 'ok',
        title: 'Frontend conectado ao Supabase',
        description: `A publishable key conseguiu falar com o projeto. Contagem pública retornada: ${count ?? 0}.`,
      });
      return;
    }

    const permissionCodes = new Set(['42501', 'PGRST301']);
    if (permissionCodes.has(error.code || '')) {
      setFrontendSupabaseStatus({
        state: 'warning',
        title: 'Supabase respondeu, mas a tabela está protegida',
        description: 'Isso costuma ser esperado com RLS ativa. A publishable key alcançou o projeto, então as variáveis públicas parecem corretas.',
      });
      return;
    }

    setFrontendSupabaseStatus({
      state: 'error',
      title: 'Falha ao falar com o Supabase',
      description: error.message || 'Revise as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
    });
  };

  const renderStatusBadge = () => {
    switch (frontendSupabaseStatus.state) {
      case 'ok':
        return <Badge>Conectado</Badge>;
      case 'warning':
        return <Badge variant="secondary">Protegido</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'loading':
        return <Badge variant="outline">Verificando</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-semibold">Central de Controle</h1>
        </div>
        <Button onClick={fetchUsers} variant="outline">Atualizar</Button>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="font-medium">Usuários Administrativos</h2>
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
            <div>
              <div className="font-medium">{user.full_name || 'Sem nome'}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              <div className="text-xs text-muted-foreground">
                Criado em {new Date(user.created_at).toLocaleString('pt-BR')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user.must_change_password ? <Badge variant="secondary">Troca pendente</Badge> : null}
              <Badge>{user.role}</Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Status do Supabase no Frontend</CardTitle>
              <CardDescription>Validação usando o client `@supabase/supabase-js` do navegador.</CardDescription>
            </div>
            {renderStatusBadge()}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              {frontendSupabaseStatus.state === 'ok' ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
              ) : (
                <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600" />
              )}
              <div>
                <div className="font-medium">{frontendSupabaseStatus.title}</div>
                <p className="text-sm text-muted-foreground">{frontendSupabaseStatus.description}</p>
              </div>
            </div>
            <div className="rounded-lg border p-3 text-xs text-muted-foreground space-y-1">
              <div><strong>VITE_SUPABASE_URL:</strong> {import.meta.env.VITE_SUPABASE_URL ? 'preenchida' : 'faltando'}</div>
              <div><strong>VITE_SUPABASE_PUBLISHABLE_KEY:</strong> {import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'preenchida' : 'faltando'}</div>
            </div>
            <Button variant="outline" onClick={() => void verifyFrontendSupabase()}>
              Revalidar conexão
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Checklist de Deploy</CardTitle>
            <CardDescription>Valores que precisam existir para o fluxo completo funcionar em produção.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border p-3">
              <div className="font-medium">Frontend</div>
              <div className="text-muted-foreground">`VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-medium">Backend no Render</div>
              <div className="text-muted-foreground">`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `DEFAULT_ADMIN_PASSWORD`, `SUPER_ADMIN_EMAILS`</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="font-medium">Primeiro acesso</div>
              <div className="text-muted-foreground">Entrar com `Senha123##`, redefinir a senha e confirmar que `must_change_password` virou `false`.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
