import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, BarChart3, Zap, Eye, EyeOff, Check } from 'lucide-react';
import { DnaHelixScene } from '@/components/visuals/DnaHelixScene';
import { BrandMark } from '@/components/BrandMark';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (user) {
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) setError(signInError.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen bg-background">
      <section className="auth-story">
        <BrandMark className="relative z-10" />
        <div className="relative z-10 mt-12 max-w-lg">
          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">Acesse seu painel<br />com <span className="gradient-text">inteligência visual</span></h1>
          <div className="mt-6 h-0.5 w-24 bg-gradient-to-r from-primary to-accent" />
          <p className="mt-7 max-w-md text-sm leading-7 text-muted-foreground">Transforme dados do Instagram em decisões estratégicas com análises avançadas, em tempo real.</p>
          <div className="mt-8 space-y-5">
            {[
              [ShieldCheck, 'Segurança avançada', 'Proteção de dados e acesso monitorado.'],
              [BarChart3, 'Controle total', 'Gerencie perfis e análises com autonomia.'],
              [Zap, 'Análise em tempo real', 'Métricas atualizadas para decisões melhores.'],
            ].map(([Icon, title, text]) => <div key={String(title)} className="flex items-center gap-4"><div className="auth-benefit-icon"><Icon className="h-5 w-5" /></div><div><strong className="text-sm">{String(title)}</strong><p className="mt-1 text-xs text-muted-foreground">{String(text)}</p></div></div>)}
          </div>
        </div>
        <div className="auth-dna"><DnaHelixScene intensity="hero" className="absolute inset-0" /></div>
        <div className="relative z-10 mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />Dados protegidos. Resultados que geram impacto.</div>
      </section>

      <section className="auth-form-section">
        <div className="auth-panel">
          <BrandMark compact className="mx-auto mb-5 w-fit" />
          <div className="mb-7 text-center"><h2 className="text-2xl font-bold">Acesso ao Painel</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Use seu login administrativo<br />configurado para este painel.</p></div>
            {error && <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email corporativo</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-[52px] pl-12" placeholder="seu@email.com" autoComplete="username" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="h-[52px] px-12" autoComplete="current-password" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                </div>
              </div>
              <button type="button" onClick={() => setRemember(!remember)} className="flex items-center gap-2 text-xs text-muted-foreground"><span className={`flex h-4 w-4 items-center justify-center rounded-sm border ${remember ? 'border-primary bg-primary text-white' : 'border-border'}`}>{remember && <Check className="h-3 w-3" />}</span>Lembrar acesso</button>
              <Button type="submit" className="h-[52px] w-full gap-8 text-base shadow-[0_0_30px_hsl(var(--primary)/0.2)]" disabled={isLoading}>
                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Entrando...</> : <>Entrar <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>
            <div className="mt-7 flex items-center gap-4 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><ShieldCheck className="h-4 w-4 text-primary" />Acesso seguro e monitorado<span className="h-px flex-1 bg-border" /></div>
            <div className="mt-6 border-t border-border/70 pt-5 text-center text-xs text-muted-foreground"><Lock className="mr-2 inline h-3.5 w-3.5" />Somente usuários autorizados</div>
        </div>
      </section>
    </div>
  );
}
