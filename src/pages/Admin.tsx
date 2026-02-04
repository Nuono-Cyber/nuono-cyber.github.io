import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Copy, 
  Loader2, 
  Plus, 
  Trash2, 
  Users,
  AlertCircle,
  Shield,
  Key,
  RefreshCw
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
  const [error, setError] = useState<string | null>(null);

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
      // Fetch invites
      const { data: invitesData, error: invitesError } = await supabase
        .from('invites')
        .select('id, token, code, used_at, expires_at, created_at')
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;
      setInvites(invitesData || []);

      // Fetch users with roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each profile
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
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createInviteCode = async () => {
    setIsCreating(true);
    setError(null);

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
      setError(err.message);
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
      const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', id);

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

  const getStatusBadge = (invite: Invite) => {
    if (invite.used_at) {
      return <Badge variant="secondary">Usado</Badge>;
    }
    if (new Date(invite.expires_at) <= new Date()) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600">Disponível</Badge>;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">Super Admin</Badge>;
      case 'admin':
        return <Badge variant="default">Admin</Badge>;
      default:
        return <Badge variant="secondary">Usuário</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Painel Administrativo</h1>
                <p className="text-sm text-muted-foreground">Gerenciar códigos e usuários</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Generate Code Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Gerar Código de Convite
            </CardTitle>
            <CardDescription>
              Gere um código hexadecimal único para novos usuários se cadastrarem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button 
                onClick={createInviteCode} 
                disabled={isCreating}
                className="gap-2"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Gerar Novo Código
              </Button>
              <Button 
                variant="outline" 
                onClick={fetchData}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Codes List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Códigos Gerados
            </CardTitle>
            <CardDescription>
              {invites.length} código(s) gerado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum código gerado ainda
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-mono font-bold text-lg">
                          {invite.code ? formatHexCode(invite.code) : '—'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invite)}
                        </TableCell>
                        <TableCell>
                          {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {invite.code && isInviteValid(invite) && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => copyCode(invite.code!)}
                                title="Copiar código"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            {!invite.used_at && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteInvite(invite.id)}
                                title="Excluir código"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuários Cadastrados
            </CardTitle>
            <CardDescription>
              {users.length} usuário(s) no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum usuário cadastrado ainda
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          {u.full_name || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                        <TableCell>
                          {new Date(u.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
