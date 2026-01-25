import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Loader2, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateHexCode, formatHexCode } from '@/utils/inviteCodeGenerator';

interface InviteRecord {
  id: string;
  code: string;
  email?: string;
  created_at: string;
  expires_at: string;
  used_at?: string;
}

export default function InviteAdmin() {
  const { user, isSuperAdmin } = useAuthContext();
  const navigate = useNavigate();

  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Redirect if not super admin
  if (!isSuperAdmin) {
    navigate('/');
    return null;
  }

  const loadInvites = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setInvites((data || []) as InviteRecord[]);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar convites');
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsGenerating(true);

    try {
      const code = generateHexCode();

      const { error: insertError } = await supabase
        .from('invites')
        .insert({
          code: code.toLowerCase(),
          email: email || null,
          invited_by: user?.id,
        });

      if (insertError) throw insertError;

      setSuccess(`Código gerado com sucesso: ${formatHexCode(code)}`);
      setEmail('');
      await loadInvites();
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar código');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(formatHexCode(code));
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const deleteInvite = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este convite?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('invites')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSuccess('Convite deletado com sucesso');
      await loadInvites();
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar convite');
    }
  };

  const isCodeUsed = (invite: InviteRecord) => !!invite.used_at;
  const isCodeExpired = (invite: InviteRecord) => new Date(invite.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Gerenciador de Convites</h1>
          <p className="text-muted-foreground">
            Gere códigos hexadecimais para permitir que novos usuários se cadastrem
          </p>
        </div>

        {/* Generate New Code Card */}
        <Card>
          <CardHeader>
            <CardTitle>Gerar Novo Código</CardTitle>
            <CardDescription>
              Crie um novo código de convite para um usuário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generateInviteCode} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-500 text-green-700 bg-green-50">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="invite-email">Email (Opcional)</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="usuario@nadenterprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Se preenchido, este código será vinculado ao email específico
                </p>
              </div>

              <Button type="submit" disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar Código'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Invites List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Códigos Ativos</CardTitle>
              <CardDescription>
                Lista de todos os códigos de convite gerados
              </CardDescription>
            </div>
            <Button
              onClick={loadInvites}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isLoading ? 'Carregando...' : 'Nenhum código gerado ainda'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow
                        key={invite.id}
                        className={
                          isCodeUsed(invite)
                            ? 'opacity-50 line-through'
                            : isCodeExpired(invite)
                              ? 'opacity-50'
                              : ''
                        }
                      >
                        <TableCell className="font-mono font-bold">
                          {formatHexCode(invite.code)}
                        </TableCell>
                        <TableCell>{invite.email || '-'}</TableCell>
                        <TableCell>
                          {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {isCodeUsed(invite) ? (
                            <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                              <CheckCircle className="h-4 w-4" />
                              Usado
                            </span>
                          ) : isCodeExpired(invite) ? (
                            <span className="inline-flex items-center gap-1 text-sm text-red-500">
                              <AlertCircle className="h-4 w-4" />
                              Expirado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sm text-green-500">
                              <CheckCircle className="h-4 w-4" />
                              Ativo
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(invite.code)}
                              disabled={isCodeUsed(invite) || isCodeExpired(invite)}
                            >
                              {copiedCode === invite.code ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
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
      </div>
    </div>
  );
}
