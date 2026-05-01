import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateHexCode, formatHexCode } from '@/utils/inviteCodeGenerator';

interface Invite {
  id: string;
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
  const { isSuperAdmin } = useAuthContext();
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
      const [invitesResp, usersResp] = await Promise.all([api.invites.listAdmin(), api.users.listAdmin()]);
      setInvites((invitesResp.rows || []) as Invite[]);
      setUsers((usersResp.rows || []) as UserProfile[]);
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
      const { row } = await api.invites.createAdmin({ code });
      setInvites([row, ...invites]);
      await navigator.clipboard.writeText(formatHexCode(code));
      toast.success(`Código ${formatHexCode(code)} gerado e copiado`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteInvite = async (id: string) => {
    try {
      await api.invites.deleteAdmin(id);
      setInvites(invites.filter((i) => i.id !== id));
    } catch (err: any) {
      toast.error(err.message);
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
        <Button onClick={fetchData} variant="outline">Atualizar</Button>
      </div>

      <div className="flex gap-3">
        <Button onClick={createInviteCode} disabled={isCreating}>
          {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Gerar Código
        </Button>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="font-medium">Convites</h2>
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
            <div className="flex items-center gap-3">
              <span className="font-mono">{invite.code ? formatHexCode(invite.code) : '-'}</span>
              <Badge variant={invite.used_at ? 'secondary' : 'default'}>
                {invite.used_at ? 'Utilizado' : 'Ativo'}
              </Badge>
            </div>
            <div className="flex gap-2">
              {invite.code && (
                <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(formatHexCode(invite.code))}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              {!invite.used_at && (
                <Button size="icon" variant="ghost" onClick={() => deleteInvite(invite.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <h2 className="font-medium">Usuários</h2>
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
            <div>
              <div className="font-medium">{u.full_name || 'Sem nome'}</div>
              <div className="text-sm text-muted-foreground">{u.email}</div>
            </div>
            <Badge>{u.role}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
