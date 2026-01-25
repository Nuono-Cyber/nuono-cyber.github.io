import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Mail, 
  Plus, 
  Send, 
  Trash2, 
  Users,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface Invite {
  id: string;
  token: string;
  email: string | null;
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
  const [newInviteEmail, setNewInviteEmail] = useState('');
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
        .select('*')
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

  const createInvite = async (withEmail: boolean = false) => {
    setIsCreating(true);
    setError(null);

    try {
      const inviteData: any = {
        invited_by: user?.id,
      };

      if (withEmail && newInviteEmail) {
        if (!newInviteEmail.endsWith('@nadenterprise.com')) {
          setError('Apenas emails @nadenterprise.com são permitidos');
          setIsCreating(false);
          return;
        }
        inviteData.email = newInviteEmail;
      }

      const { data, error } = await supabase
        .from('invites')
        .insert(inviteData)
        .select()
        .single();

      if (error) throw error;

      setInvites([data, ...invites]);
      setNewInviteEmail('');
      
      const inviteUrl = `${window.location.origin}/auth?invite=${data.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Convite criado e link copiado para a área de transferência!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const copyInviteLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/auth?invite=${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success('Link copiado!');
  };

  const deleteInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInvites(invites.filter(i => i.id !== id));
      toast.success('Convite excluído');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const isInviteValid = (invite: Invite) => {
    return !invite.used_at && new Date(invite.expires_at) > new Date();
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
                  <p className="text-sm text-muted-foreground">Gerenciar usuários e convites</p>
                </div>
              </div>
              <div className="ml-auto">
                <Button variant="outline" onClick={() => window.open('https://supabase.com/dashboard/project/hafwvsiwsuhiazboivyb/sql', '_blank')}>
                  <Shield className="w-4 h-4 mr-2" />
                  Aplicar Migration
                </Button>
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

        {/* Create Invite Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Criar Convite
            </CardTitle>
            <CardDescription>
              Gere um link de convite para novos usuários
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="invite-email">Email (opcional)</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="usuario@nadenterprise.com"
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Se informado, apenas este email poderá usar o convite
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => createInvite(false)} 
                disabled={isCreating}
                variant="outline"
              >
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LinkIcon className="mr-2 h-4 w-4" />
                )}
                Gerar Link Genérico
              </Button>
              <Button 
                onClick={() => createInvite(true)} 
                disabled={isCreating || !newInviteEmail}
              >
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Gerar Link para Email
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invites List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Convites Gerados
            </CardTitle>
            <CardDescription>
              {invites.length} convite(s) gerado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum convite gerado ainda
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell>
                          {invite.email || <span className="text-muted-foreground">Genérico</span>}
                        </TableCell>
                        <TableCell>
                          {invite.used_at ? (
                            <Badge variant="secondary">Usado</Badge>
                          ) : isInviteValid(invite) ? (
                            <Badge className="bg-green-500">Válido</Badge>
                          ) : (
                            <Badge variant="destructive">Expirado</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {isInviteValid(invite) && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => copyInviteLink(invite.token)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => deleteInvite(invite.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
