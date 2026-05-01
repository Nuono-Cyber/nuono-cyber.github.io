import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { generateHexCode, formatHexCode } from '@/utils/inviteCodeGenerator';
import { toast } from 'sonner';

export default function InviteAdmin() {
  const { isSuperAdmin } = useAuthContext();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) navigate('/');
    loadInvites();
  }, [isSuperAdmin, navigate]);

  const loadInvites = async () => {
    const { rows } = await api.invites.listAdmin();
    setInvites(rows || []);
  };

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = generateHexCode();
    await api.invites.createAdmin({ code, email: email || undefined, personalEmail: personalEmail || undefined });
    toast.success(`Código gerado: ${formatHexCode(code)}`);
    setEmail('');
    setPersonalEmail('');
    loadInvites();
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>Gerar Convite</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={createInvite}>
            <div><Label>Email corporativo (opcional)</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Email pessoal (opcional)</Label><Input value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} /></div>
            <Button type="submit">Gerar</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Convites</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {invites.map((i) => (
              <div className="border rounded p-2 flex items-center justify-between" key={i.id}>
                <span className="font-mono">{i.code ? formatHexCode(i.code) : '-'}</span>
                <span className="text-sm text-muted-foreground">{i.used_at ? 'Usado' : 'Ativo'}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
