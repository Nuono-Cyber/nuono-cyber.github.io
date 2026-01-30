import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Instagram, Loader2, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido').refine(
  (email) => email.endsWith('@nadenterprise.com'),
  'Apenas emails @nadenterprise.com são permitidos'
);

const personalEmailSchema = z.string().email('Email pessoal inválido');

const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres');

const inviteCodeSchema = z.string().length(10, 'Código deve ter 10 caracteres').regex(/^[a-f0-9]+$/, 'Código deve conter apenas números e letras a-f');

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
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
  
  // Reset password dialog
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetPersonalEmail, setResetPersonalEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const validateInviteCode = async (code: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('id, code, used_at, expires_at')
        .eq('code', code.toLowerCase())
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        setError('Código inválido, expirado ou já utilizado');
        return false;
      }

      return true;
    } catch (err) {
      setError('Erro ao validar código');
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else {
          setError(error.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate inputs
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        setError(emailResult.error.errors[0].message);
        setIsLoading(false);
        return;
      }

      const personalEmailResult = personalEmailSchema.safeParse(personalEmail);
      if (!personalEmailResult.success) {
        setError(personalEmailResult.error.errors[0].message);
        setIsLoading(false);
        return;
      }

      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        setError(passwordResult.error.errors[0].message);
        setIsLoading(false);
        return;
      }

      // Check invite code requirement for non-super admin emails
      const isSuperAdminEmail = ['gabrielnbn@nadenterprise.com', 'nadsongl@nadenterprise.com'].includes(email);
      if (!isSuperAdminEmail) {
        // Validate invite code for regular users
        const codeResult = inviteCodeSchema.safeParse(inviteCode);
        if (!codeResult.success) {
          setError('Código de convite inválido');
          setIsLoading(false);
          return;
        }

        const isCodeValid = await validateInviteCode(inviteCode);
        if (!isCodeValid) {
          setIsLoading(false);
          return;
        }
      }

      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            personal_email: personalEmail,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setError('Este email já está cadastrado');
        } else {
          setError(error.message);
        }
        setIsLoading(false);
        return;
      }

      // Mark invite code as used
      if (!isSuperAdminEmail && inviteCode) {
        await supabase
          .from('invites')
          .update({ used_at: new Date().toISOString() })
          .eq('code', inviteCode.toLowerCase());
      }

      setSuccess('Conta criada com sucesso! Você será redirecionado...');
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
      // Validate inputs
      const emailResult = emailSchema.safeParse(resetEmail);
      if (!emailResult.success) {
        setError(emailResult.error.errors[0].message);
        setIsResetting(false);
        return;
      }

      const personalEmailResult = personalEmailSchema.safeParse(resetPersonalEmail);
      if (!personalEmailResult.success) {
        setError(personalEmailResult.error.errors[0].message);
        setIsResetting(false);
        return;
      }

      // Verify that the personal email matches the one in the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('personal_email, user_id')
        .eq('email', resetEmail)
        .maybeSingle();

      if (profileError || !profile) {
        setError('Email corporativo não encontrado');
        setIsResetting(false);
        return;
      }

      if (profile.personal_email !== resetPersonalEmail) {
        setError('Email pessoal não corresponde ao cadastrado');
        setIsResetting(false);
        return;
      }

      // Generate a password reset token and send via edge function
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          corporateEmail: resetEmail,
          personalEmail: resetPersonalEmail,
          redirectUrl: `${window.location.origin}/auth/reset-password`,
        },
      });

      if (error) {
        throw error;
      }

      setShowResetDialog(false);
      setResetEmail('');
      setResetPersonalEmail('');
      setSuccess('Link de recuperação enviado para seu email pessoal!');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar link de recuperação');
    } finally {
      setIsResetting(false);
    }
  };

  const openResetDialog = () => {
    setError(null);
    setResetEmail(email);
    setShowResetDialog(true);
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
            <CardTitle>
              {'Complete seu Cadastro'}
            </CardTitle>
            <CardDescription>
              {'Crie uma conta com o código de convite'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-green-500 text-green-700 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

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
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu.nome@nadenterprise.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="link"
                    className="w-full"
                    onClick={openResetDialog}
                  >
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
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email Corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu.nome@nadenterprise.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Apenas emails @nadenterprise.com são permitidos
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-invite-code">Código de Convite</Label>
                    <Input
                      id="signup-invite-code"
                      type="text"
                      placeholder="0123456789"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toLowerCase())}
                      className="uppercase font-mono"
                      maxLength={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      Código hexadecimal fornecido pelo administrador
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-personal-email">Email Pessoal</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-personal-email"
                        type="email"
                        placeholder="seu.email@gmail.com"
                        value={personalEmail}
                        onChange={(e) => setPersonalEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Para receber links de recuperação de senha
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mínimo de 6 caracteres
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar Conta'
                    )}
                  </Button>

                  {
                    <p className="text-sm text-center text-muted-foreground">
                      Precisa de um código? Solicite ao administrador.
                    </p>
                  }
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Informe seu email corporativo e pessoal para receber o link de recuperação
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Corporativo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu.nome@nadenterprise.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-personal-email">Email Pessoal</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-personal-email"
                  type="email"
                  placeholder="seu.email@gmail.com"
                  value={resetPersonalEmail}
                  onChange={(e) => setResetPersonalEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O link será enviado para este email
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowResetDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isResetting}>
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Link'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
