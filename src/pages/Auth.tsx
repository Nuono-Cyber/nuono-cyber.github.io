import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Instagram, Loader2, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido').refine(
  (email) => email.toLowerCase().endsWith('@nadenterprise.com'),
  'Apenas emails @nadenterprise.com são permitidos'
);
const personalEmailSchema = z.string().email('Email pessoal inválido');
const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres');
const inviteCodeSchema = z.string().length(10, 'Código deve ter 10 caracteres').regex(/^[a-f0-9]+$/, 'Código inválido');

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn } = useAuthContext();

  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPersonalEmail, setResetPersonalEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const validateInviteCode = async (code: string) => {
    const { valid } = await api.invites.validate(code.toLowerCase(), email.toLowerCase());
    if (!valid) setError('Código inválido, expirado ou já utilizado');
    return valid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) setError(error.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (!emailSchema.safeParse(email).success) throw new Error('Email corporativo inválido');
      if (!personalEmailSchema.safeParse(personalEmail).success) throw new Error('Email pessoal inválido');
      if (!passwordSchema.safeParse(password).success) throw new Error('Senha deve ter ao menos 6 caracteres');
      if (!inviteCodeSchema.safeParse(inviteCode).success) throw new Error('Código de convite inválido');
      const valid = await validateInviteCode(inviteCode);
      if (!valid) return;

      await api.auth.signup({
        email,
        password,
        fullName,
        personalEmail,
        inviteCode: inviteCode.toLowerCase(),
      });
      setSuccess('Conta criada com sucesso! Faça login para continuar.');
      setActiveTab('login');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
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
      if (!personalEmailSchema.safeParse(resetPersonalEmail).success) throw new Error('Email pessoal inválido');
      const data = await api.auth.requestReset({
        corporateEmail: resetEmail,
        personalEmail: resetPersonalEmail,
      });
      setShowResetDialog(false);
      setResetEmail('');
      setResetPersonalEmail('');
      if (data.resetLink) {
        setSuccess(`Link de recuperação: ${window.location.origin}${data.resetLink}`);
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
            <CardTitle>Complete seu Cadastro</CardTitle>
            <CardDescription>Crie uma conta com código de convite</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
            {success && <Alert className="mb-4 border-green-500 text-green-700 bg-green-50"><CheckCircle className="h-4 w-4" /><AlertDescription>{success}</AlertDescription></Alert>}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
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
                  <Button type="button" variant="link" className="w-full" onClick={() => { setResetEmail(email); setShowResetDialog(true); }}>
                    Esqueci minha senha
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email Corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-invite">Código de Convite</Label>
                    <Input id="signup-invite" type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toLowerCase())} maxLength={10} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-personal-email">Email Pessoal</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-personal-email" type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...</> : 'Criar Conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>Informe seu email corporativo e seu email pessoal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Corporativo</Label>
              <Input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-personal">Email Pessoal</Label>
              <Input id="reset-personal" type="email" value={resetPersonalEmail} onChange={(e) => setResetPersonalEmail(e.target.value)} required />
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
