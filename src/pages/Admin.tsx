import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: string;
  must_change_password?: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuthContext();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/');
      return;
    }
    fetchUsers();
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
    </div>
  );
}
