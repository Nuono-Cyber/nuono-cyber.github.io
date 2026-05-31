import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Database, RefreshCw, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { api, type MetaConfigResponse } from '@/lib/api';

interface DataUploadProps {
  onDataUploaded: (type: 'csv' | 'excel', data: any[], mode: 'replace' | 'increment') => void;
  isSaving?: boolean;
  totalRecords?: number;
  onRefresh?: () => void;
}

export function DataUpload({ onDataUploaded, isSaving = false, totalRecords = 0, onRefresh }: DataUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [metaConfig, setMetaConfig] = useState<MetaConfigResponse | null>(null);
  const [metaForm, setMetaForm] = useState({
    instagramUserId: '',
    accessToken: '',
    enabled: false,
    syncIntervalMinutes: '60',
  });
  const [isMetaLoading, setIsMetaLoading] = useState(true);
  const [isMetaSaving, setIsMetaSaving] = useState(false);
  const [isMetaSyncing, setIsMetaSyncing] = useState(false);
  const sampleInputRef = useRef<HTMLInputElement>(null);
  const incrementInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadMetaConfig = async () => {
      try {
        const config = await api.meta.config();
        setMetaConfig(config);
        setMetaForm({
          instagramUserId: config.instagramUserId || '',
          accessToken: '',
          enabled: config.enabled,
          syncIntervalMinutes: String(config.syncIntervalMinutes || 60),
        });
      } catch (error: any) {
        toast.error(error.message || 'Erro ao carregar configuração da Meta');
      } finally {
        setIsMetaLoading(false);
      }
    };

    loadMetaConfig();
  }, []);

  const handleFileUpload = async (file: File, mode: 'replace' | 'increment') => {
    setIsUploading(true);
    setMessage(null);
    try {
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      let data: any[] = [];

      if (isExcel) {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) throw new Error('Planilha sem abas');
        data = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
      } else {
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: '' });
        data = result.data;
      }

      onDataUploaded(isExcel ? 'excel' : 'csv', data, mode);
      setIsError(false);
      setMessage(
        mode === 'replace'
          ? `${isExcel ? 'Excel' : 'CSV'} carregado como amostra com ${data.length} registros.`
          : `${isExcel ? 'Excel' : 'CSV'} incrementado com ${data.length} registros.`
      );
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message || 'Erro ao processar arquivo');
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>, mode: 'replace' | 'increment') => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file, mode);
    event.target.value = '';
  };

  const handleMetaSave = async () => {
    try {
      setIsMetaSaving(true);
      const config = await api.meta.saveConfig({
        instagramUserId: metaForm.instagramUserId.trim(),
        accessToken: metaForm.accessToken.trim() || undefined,
        enabled: metaForm.enabled,
        syncIntervalMinutes: Number(metaForm.syncIntervalMinutes || 60),
      });
      setMetaConfig(config);
      setMetaForm((current) => ({ ...current, accessToken: '', enabled: config.enabled }));
      toast.success('Configuração da Meta salva');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configuração da Meta');
    } finally {
      setIsMetaSaving(false);
    }
  };

  const handleMetaSync = async () => {
    try {
      setIsMetaSyncing(true);
      const result = await api.meta.sync();
      toast.success(`Sincronização concluída com ${result.processed} posts`);
      const config = await api.meta.config();
      setMetaConfig(config);
      onRefresh?.();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar com a Meta');
    } finally {
      setIsMetaSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">Banco Supabase</div>
            <div className="text-sm text-muted-foreground">{totalRecords} registros</div>
          </div>
        </div>
        {onRefresh && <Button variant="outline" onClick={onRefresh}>Atualizar</Button>}
      </div>

      {message && (
        <Alert className={isError ? 'border-destructive/50 bg-destructive/10' : 'border-green-500/50 bg-green-500/10'}>
          {isError ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-xl border p-4 space-y-5">
        <div>
          <Label className="text-sm font-medium">Fluxo de importação</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Carregue uma amostra para reiniciar a base analisada ou incremente a análise com novos arquivos.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <div className="font-medium">Analisar amostra</div>
              <div className="text-xs text-muted-foreground">Substitui a base atual pelos dados do arquivo enviado.</div>
            </div>
            <Input
              id="sample-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              ref={sampleInputRef}
              onChange={(event) => handleUpload(event, 'replace')}
              disabled={isUploading || isSaving}
            />
            <Button onClick={() => sampleInputRef.current?.click()} disabled={isUploading || isSaving} className="w-full" variant="secondary">
              {isUploading || isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Enviar amostra
            </Button>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <div className="font-medium">Incrementar análise</div>
              <div className="text-xs text-muted-foreground">Mantém a base atual e faz upsert incremental por post_id.</div>
            </div>
            <Input
              id="increment-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              ref={incrementInputRef}
              onChange={(event) => handleUpload(event, 'increment')}
              disabled={isUploading || isSaving}
            />
            <Button onClick={() => incrementInputRef.current?.click()} disabled={isUploading || isSaving} className="w-full">
              {isUploading || isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Enviar incremento
            </Button>
          </div>
        </div>

        <Input
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <FileText className="h-3 w-3" />
          O fluxo de amostra reinicia a análise; o incremental adiciona ou atualiza registros existentes por post_id.
        </div>
      </div>

      <div className="rounded-xl border p-4 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-sm font-medium">Sincronização automática com a Meta</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Conecte um usuário do Instagram Graph API para atualizar o banco sem subir CSV manualmente.
            </p>
          </div>
          <Link2 className="h-5 w-5 text-primary shrink-0" />
        </div>

        {metaConfig?.lastError && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription>{metaConfig.lastError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="meta-instagram-user-id">Instagram User ID</Label>
            <Input
              id="meta-instagram-user-id"
              placeholder="1784..."
              value={metaForm.instagramUserId}
              onChange={(event) => setMetaForm((current) => ({ ...current, instagramUserId: event.target.value }))}
              disabled={isMetaLoading || isMetaSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-sync-interval">Intervalo de sync (min)</Label>
            <Input
              id="meta-sync-interval"
              type="number"
              min={15}
              step={15}
              value={metaForm.syncIntervalMinutes}
              onChange={(event) => setMetaForm((current) => ({ ...current, syncIntervalMinutes: event.target.value }))}
              disabled={isMetaLoading || isMetaSaving}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta-access-token">Access Token da Meta</Label>
          <Input
            id="meta-access-token"
            type="password"
            placeholder={metaConfig?.hasAccessToken ? 'Token salvo. Preencha só para trocar.' : 'EAAG...'}
            value={metaForm.accessToken}
            onChange={(event) => setMetaForm((current) => ({ ...current, accessToken: event.target.value }))}
            disabled={isMetaLoading || isMetaSaving}
          />
          <p className="text-xs text-muted-foreground">
            O token fica salvo no backend. Para manter o sync automático, use um token de longa duração.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">Ativar sincronização automática</div>
            <div className="text-xs text-muted-foreground">
              O backend verifica periodicamente se já passou o intervalo configurado.
            </div>
          </div>
          <Switch
            checked={metaForm.enabled}
            onCheckedChange={(checked) => setMetaForm((current) => ({ ...current, enabled: checked }))}
            disabled={isMetaLoading || isMetaSaving}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="text-xs text-muted-foreground rounded-lg border p-3">
            <div>API Meta: {metaConfig?.apiVersion || 'v23.0'}</div>
            <div>Última tentativa: {metaConfig?.lastAttemptAt ? new Date(metaConfig.lastAttemptAt).toLocaleString('pt-BR') : 'nunca'}</div>
            <div>Último sync: {metaConfig?.lastSyncedAt ? new Date(metaConfig.lastSyncedAt).toLocaleString('pt-BR') : 'nunca'}</div>
          </div>

          <Button variant="outline" onClick={handleMetaSave} disabled={isMetaLoading || isMetaSaving || isMetaSyncing}>
            {isMetaSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Salvar conexão
          </Button>

          <Button onClick={handleMetaSync} disabled={isMetaLoading || isMetaSaving || isMetaSyncing}>
            {isMetaSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sincronizar agora
          </Button>
        </div>
      </div>
    </div>
  );
}
