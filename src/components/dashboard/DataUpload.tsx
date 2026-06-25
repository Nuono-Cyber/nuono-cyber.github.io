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
import { analyzeTableSchema, type TableSchemaAnalysis } from '@/utils/dataProcessor';
import { type UploadMode } from '@/hooks/useInstagramData';

interface DataUploadProps {
  onDataUploaded: (type: 'csv' | 'excel', data: any[], mode: UploadMode, sourceName?: string) => void;
  isSaving?: boolean;
  totalRecords?: number;
  onRefresh?: () => void;
  sessionSample?: { active: boolean; name?: string; originalCount: number };
  onRestoreBase?: () => void;
}

interface PendingImport {
  type: 'csv' | 'excel';
  fileName: string;
  data: any[];
  schema: TableSchemaAnalysis;
}

export function DataUpload({
  onDataUploaded,
  isSaving = false,
  totalRecords = 0,
  onRefresh,
  sessionSample,
  onRestoreBase,
}: DataUploadProps) {
  const isLocalMode = api.isLocalToken();
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadMetaConfig = async () => {
      if (isLocalMode) {
        setIsMetaLoading(false);
        return;
      }
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
  }, [isLocalMode]);

  const handleFileUpload = async (file: File) => {
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

      if (data.length === 0) throw new Error('Arquivo sem registros válidos');

      const schema = analyzeTableSchema(data);
      setPendingImport({
        type: isExcel ? 'excel' : 'csv',
        fileName: file.name,
        data,
        schema,
      });
      setIsError(false);
      setMessage(`${isExcel ? 'Excel' : 'CSV'} lido com ${data.length} registros. Escolha como deseja usar esta tabela.`);
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message || 'Erro ao processar arquivo');
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file);
    event.target.value = '';
  };

  const applyPendingImport = (mode: UploadMode) => {
    if (!pendingImport) return;
    onDataUploaded(pendingImport.type, pendingImport.data, mode, pendingImport.fileName);
    setIsError(false);
    setMessage(
      mode === 'session'
        ? `${pendingImport.fileName} carregado como análise individual nesta sessão.`
        : mode === 'replace'
          ? `${pendingImport.fileName} substituirá a base analisada.`
          : `${pendingImport.fileName} será incrementado à base existente.`
    );
    setPendingImport(null);
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
            <div className="font-medium">{isLocalMode ? 'Base local' : 'Banco Supabase'}</div>
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

      {sessionSample?.active && (
        <Alert className="border-primary/40 bg-primary/10">
          <FileText className="h-4 w-4 text-primary" />
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Você está analisando uma amostra individual{sessionSample.name ? `: ${sessionSample.name}` : ''}. A base original tem {sessionSample.originalCount} registros.
            </span>
            {onRestoreBase && (
              <Button type="button" variant="outline" size="sm" onClick={onRestoreBase} className="shrink-0">
                Voltar à visão original
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-xl border p-4 space-y-5">
        <div>
          <Label className="text-sm font-medium">Fluxo de importação</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Envie uma tabela para análise individual ou incremente a base atual após validar as colunas detectadas.
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div>
            <div className="font-medium">Escolher CSV ou Excel</div>
            <div className="text-xs text-muted-foreground">
              O sistema detecta colunas semelhantes, como caption/descrição, timestamp/data, views/visualizações e reach/alcance.
            </div>
          </div>
          <Input
            id="table-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            ref={fileInputRef}
            onChange={handleUpload}
            disabled={isUploading || isSaving}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading || isSaving} className="w-full">
            {isUploading || isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Ler tabela
          </Button>
        </div>

        {pendingImport && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium">{pendingImport.fileName}</div>
                <div className="text-xs text-muted-foreground">
                  {pendingImport.data.length} registros, {pendingImport.schema.columns.length} colunas, confiança de mapeamento {pendingImport.schema.confidence}%.
                </div>
              </div>
              <div className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
                Base atual: {totalRecords} registros
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {pendingImport.schema.mappedFields.filter((field) => field.sourceColumn).map((field) => (
                <div key={field.field} className="rounded-md border bg-background/70 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">{field.label}: </span>
                  <span className="font-medium">{field.sourceColumn}</span>
                </div>
              ))}
            </div>

            {(pendingImport.schema.missingRequired.length > 0 || pendingImport.schema.missingRecommended.length > 0) && (
              <Alert className={pendingImport.schema.missingRequired.length > 0 ? 'border-destructive/50 bg-destructive/10' : ''}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {pendingImport.schema.missingRequired.length > 0
                    ? `Campos obrigatórios não detectados: ${pendingImport.schema.missingRequired.join(', ')}.`
                    : `Campos recomendados não detectados: ${pendingImport.schema.missingRecommended.join(', ')}.`}
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border bg-background/70 p-3">
              <div className="text-sm font-medium">Como deseja usar esta tabela?</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Para uma análise individual, o dashboard passa a usar apenas este arquivo nesta sessão. Para incremento, registros com o mesmo ID de post são atualizados e novos posts são adicionados.
              </p>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <Button variant="secondary" onClick={() => applyPendingImport('session')} disabled={isSaving || pendingImport.schema.missingRequired.length > 0}>
                Analisar individualmente
              </Button>
              <Button variant="outline" onClick={() => applyPendingImport('replace')} disabled={isSaving || pendingImport.schema.missingRequired.length > 0}>
                Substituir base
              </Button>
              <Button onClick={() => applyPendingImport('increment')} disabled={isSaving || pendingImport.schema.missingRequired.length > 0}>
                Incrementar base existente
              </Button>
            </div>
          </div>
        )}

        <Input
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <FileText className="h-3 w-3" />
          O sistema aceita CSV e Excel com nomes de colunas iguais ou semelhantes aos exports da Meta/Instagram.
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
