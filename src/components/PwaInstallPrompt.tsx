import { useEffect, useState } from 'react';
import { ArrowUp, Check, Download, Share, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/BrandMark';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISSED_KEY = 'nad-pwa-install-dismissed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const preview = new URLSearchParams(window.location.search).has('pwa-preview');
    if ((!mobile && !preview) || isStandalone() || (!preview && localStorage.getItem(DISMISSED_KEY))) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      window.setTimeout(() => setVisible(true), 900);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      localStorage.setItem(DISMISSED_KEY, 'installed');
      window.setTimeout(() => setVisible(false), 1800);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const timer = window.setTimeout(() => setVisible(true), preview ? 500 : 1600);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [isIos]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'dismissed');
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) {
      setShowInstructions(true);
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') localStorage.setItem(DISMISSED_KEY, 'installed');
    else localStorage.setItem(DISMISSED_KEY, 'dismissed');
    setVisible(false);
    setInstallEvent(null);
  };

  if (!visible) return null;

  return (
    <div className="pwa-prompt-layer" role="dialog" aria-modal="true" aria-labelledby="pwa-title">
      <button className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={dismiss} aria-label="Fechar convite" />
      <section className="pwa-install-card">
        <div className="pwa-glow-line" />
        <Button variant="ghost" size="icon" className="absolute right-3 top-3 z-10 h-9 w-9" onClick={dismiss} aria-label="Fechar"><X className="h-4 w-4" /></Button>

        {installed ? (
          <div className="px-6 py-10 text-center"><span className="pwa-success"><Check /></span><h2 id="pwa-title" className="mt-5 text-xl font-bold">App instalado</h2><p className="mt-2 text-sm text-muted-foreground">NAD Analytics está pronto na sua tela inicial.</p></div>
        ) : (
          <>
            <div className="pwa-visual">
              <div className="pwa-orbit pwa-orbit-one" /><div className="pwa-orbit pwa-orbit-two" />
              <BrandMark compact />
              <span className="pwa-float-icon pwa-float-one"><Sparkles /></span>
              <span className="pwa-float-icon pwa-float-two"><Zap /></span>
            </div>
            <div className="px-6 pb-6 text-center">
              <span className="pwa-eyebrow">Sua inteligência sempre por perto</span>
              <h2 id="pwa-title" className="mt-3 text-2xl font-extrabold">Instale o NAD Analytics</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Acesse suas métricas em tela cheia, abra mais rápido e continue consultando a demonstração mesmo com conexão instável.</p>

              <div className="pwa-benefits">
                <span><Zap />Acesso rápido</span><span><ShieldCheck />Seguro</span><span><Download />Instalável</span>
              </div>

              {showInstructions ? (
                <div className="pwa-instructions">
                  {isIos ? <><Share /><span>Toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</span></> : <><ArrowUp /><span>Abra o menu do navegador e selecione <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</span></>}
                </div>
              ) : (
                <Button onClick={install} className="mt-5 h-12 w-full gap-3 text-sm shadow-[0_0_28px_hsl(var(--primary)/0.28)]"><Download className="h-4 w-4" />Instalar aplicativo</Button>
              )}
              <button onClick={dismiss} className="mt-4 text-xs text-muted-foreground transition-colors hover:text-foreground">Agora não</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
