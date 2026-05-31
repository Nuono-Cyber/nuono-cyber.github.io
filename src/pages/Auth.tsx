import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Instagram, Loader2, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido').refine(
  (email) => email.toLowerCase().endsWith('@nadenterprise.com'),
  'Apenas emails @nadenterprise.com são permitidos'
);
const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres');

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetMode, setResetMode] = useState<'first-access' | 'password-reset'>('password-reset');
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (user) {
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      const { error: signInError, requiresPasswordChange, requiresFirstAccessLink, resetPath } = await signIn(email, password);
      if (requiresPasswordChange && resetPath) {
        navigate(resetPath, {
          replace: true,
          state: {
            email,
            firstAccess: true,
          },
        });
        return;
      }
      if (requiresFirstAccessLink) {
        setResetMode('first-access');
        setResetEmail(email);
        setShowResetDialog(true);
        return;
      }
      if (signInError) setError(signInError.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsResetting(true);
    try {
      if (!emailSchema.safeParse(resetEmail).success) throw new Error('Email corporativo inválido');
      const data = resetMode === 'first-access'
        ? await api.auth.requestFirstAccess({ corporateEmail: resetEmail })
        : await api.auth.requestReset({ corporateEmail: resetEmail });
      setShowResetDialog(false);
      setResetEmail('');
      if ('resetLink' in data && data.resetLink) {
        const fullLink = `${window.location.origin}${data.resetLink}`;
        setSuccess(resetMode === 'first-access' ? `Link único de primeiro acesso: ${fullLink}` : `Link de recuperação: ${fullLink}`);
        navigate(data.resetPath || data.resetLink, {
          replace: true,
          state: { firstAccess: resetMode === 'first-access' },
        });
      } else {
        setSuccess('Solicitação de recuperação enviada.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao recuperar senha');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl instagram-gradient mb-4">
            <Instagram className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Instagram Analytics</h1>
          <p className="text-muted-foreground">NAD Enterprise</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Acesso ao Painel</CardTitle>
            <CardDescription>Primeiro acesso agora usa um link único de ativação. Senhas temporárias compartilhadas foram removidas.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            {success && <Alert className="mb-4 border-green-500 text-green-700 bg-green-50"><CheckCircle className="h-4 w-4" /><AlertDescription>{success}</AlertDescription></Alert>}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email Corporativo</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</> : 'Entrar'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setResetMode('first-access');
                  setResetEmail(email);
                  setShowResetDialog(true);
                }}
              >
                Primeiro acesso
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => {
                  setResetMode('password-reset');
                  setResetEmail(email);
                  setShowResetDialog(true);
                }}
              >
                Esqueci minha senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resetMode === 'first-access' ? 'Primeiro acesso' : 'Recuperar Senha'}</DialogTitle>
            <DialogDescription>
              {resetMode === 'first-access'
                ? 'Informe seu email corporativo para gerar um link único de ativação. Esse link pode ser usado uma única vez.'
                : 'Informe seu email corporativo para gerar um novo link de redefinição.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Corporativo</Label>
              <Input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowResetDialog(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={isResetting}>
                {isResetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : 'Gerar Link'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
