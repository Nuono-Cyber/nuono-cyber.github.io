import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Database,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DataUploadProps {
  onDataUploaded: (type: 'csv' | 'xlsx', data: any[]) => void;
  isSaving?: boolean;
  totalRecords?: number;
  onRefresh?: () => void;
}

export function DataUpload({ 
  onDataUploaded, 
  isSaving = false, 
  totalRecords = 0,
  onRefresh
}: DataUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'csv' | 'xlsx' | null;
    status: 'success' | 'error' | null;
    message: string;
  }>({ type: null, status: null, message: '' });

  const csvInputRef = useRef<HTMLInputElement>(null);
  const [sheetId, setSheetId] = useState('');
  const [sheetRange, setSheetRange] = useState('A:Z');
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus({ type: null, status: null, message: '' });

    try {
      const text = await file.text();
      const Papa = (await import('papaparse')).default;
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      const data = result.data;

      onDataUploaded('csv', data);
      setUploadStatus({
        type: 'csv',
        status: 'success',
        message: `CSV processado! ${data.length} registros serão incrementados no banco de dados.`
      });
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setUploadStatus({
        type: 'csv',
        status: 'error',
        message: `Erro ao processar arquivo CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
      toast.error('Erro ao processar CSV');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFetchSheet = async () => {
    if (!sheetId) {
      toast.error('Informe o ID da planilha');
      return;
    }

    setIsFetchingSheet(true);
    setUploadStatus({ type: 'xlsx', status: null, message: '' });

    try {
      const { data, error } = await supabase.functions.invoke('sheets-sync', {
        body: { action: 'fetch', spreadsheetId: sheetId, range: sheetRange },
      });

      if (error) throw error;
      if (!data?.rows) throw new Error('Resposta inválida do serviço');

      // Passa os dados como se fossem XLSX
      onDataUploaded('xlsx', data.rows);

      setUploadStatus({
        type: 'xlsx',
        status: 'success',
        message: `Planilha importada! ${data.count || data.rows.length} registros.`,
      });
    } catch (err: any) {
      console.error('Erro ao buscar planilha:', err);
      setUploadStatus({ type: 'xlsx', status: 'error', message: err.message || 'Erro desconhecido' });
      toast.error('Erro ao importar planilha do Google Sheets');
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const isProcessing = isUploading || isSaving;

  return (
    <div className="space-y-6">
      {/* Database Status Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Banco de Dados Cloud</h2>
              <p className="text-sm text-muted-foreground">
            {/* Google Sheets Import Card */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-6 border-b border-border bg-gradient-to-br from-[hsl(var(--info))]/5 to-transparent">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-[hsl(var(--info))]/10">
                    <FileText className="w-5 h-5 text-[hsl(var(--info))]" />
                  </div>
                  <h3 className="font-semibold">Importar do Google Sheets</h3>
                </div>
                <p className="text-sm text-muted-foreground">Informe o ID da planilha e o intervalo (opcional) para buscar os dados.</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <Label htmlFor="sheet-id" className="text-sm text-muted-foreground">ID da planilha (entre /d/ e /edit na URL)</Label>
                  <Input
                    id="sheet-id"
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    placeholder="1a2B3cD4eF5GhIjK..."
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="sheet-range" className="text-sm text-muted-foreground">Range (ex.: A:Z ou Sheet1!A:Z)</Label>
                  <Input
                    id="sheet-range"
                    value={sheetRange}
                    onChange={(e) => setSheetRange(e.target.value)}
                    placeholder="A:Z"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleFetchSheet}
                  disabled={isProcessing || isFetchingSheet}
                  className="w-full rounded-xl gap-2"
                  variant="outline"
                >
                  {isFetchingSheet ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isFetchingSheet ? 'Importando...' : 'Importar do Google Sheets'}
                </Button>
              </div>
            </div>

                {totalRecords > 0 
                  ? `${totalRecords.toLocaleString('pt-BR')} registros armazenados`
                  : 'Nenhum registro armazenado ainda'
                }
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                disabled={isProcessing}
                className="gap-2 rounded-xl"
              >
                <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Status */}
      {uploadStatus.status && (
        <Alert className={`rounded-xl ${
          uploadStatus.status === 'success' 
            ? 'border-[hsl(var(--success))]/50 bg-[hsl(var(--success))]/10' 
            : 'border-destructive/50 bg-destructive/10'
        }`}>
          {uploadStatus.status === 'success' ? (
            <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          <AlertDescription className={
            uploadStatus.status === 'success' ? 'text-[hsl(var(--success))]' : 'text-destructive'
          }>
            {uploadStatus.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Processing Indicator */}
      {isSaving && (
        <Alert className="rounded-xl border-primary/50 bg-primary/10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <AlertDescription className="text-primary">
            Salvando dados no banco de dados cloud...
          </AlertDescription>
        </Alert>
      )}

      {/* CSV Upload Card - For Instagram Posts */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-br from-[hsl(var(--info))]/5 to-transparent">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[hsl(var(--info))]/10">
              <FileText className="w-5 h-5 text-[hsl(var(--info))]" />
            </div>
            <h3 className="font-semibold">Importar Posts (CSV)</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Importa posts do Instagram. Registros duplicados são atualizados automaticamente.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Label htmlFor="csv-upload" className="text-sm text-muted-foreground">
              Selecione arquivo CSV com posts
            </Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              ref={csvInputRef}
              onChange={handleCSVUpload}
              disabled={isProcessing}
              className="mt-1 rounded-xl"
            />
          </div>
          <Button
            onClick={() => csvInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full rounded-xl gap-2"
            variant="outline"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isProcessing ? 'Processando...' : 'Importar CSV'}
          </Button>
        </div>
      </div>

      {/* Info */}
      {/* Google Sheets Import Card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-br from-[hsl(var(--info))]/5 to-transparent">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[hsl(var(--info))]/10">
              <Database className="w-5 h-5 text-[hsl(var(--info))]" />
            </div>
            <h3 className="font-semibold">Importar do Google Sheets</h3>
          </div>
          <p className="text-sm text-muted-foreground">Importe diretamente uma planilha do Google (via Service Account).</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Label htmlFor="sheet-id" className="text-sm text-muted-foreground">ID da planilha</Label>
            <Input id="sheet-id" value={sheetId} onChange={(e) => setSheetId(e.target.value)} placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" className="mt-1 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="sheet-range" className="text-sm text-muted-foreground">Range (opcional)</Label>
            <Input id="sheet-range" value={sheetRange} onChange={(e) => setSheetRange(e.target.value)} placeholder="Ex: Sheet1!A:Z or A:Z" className="mt-1 rounded-xl" />
          </div>
          <Button
            onClick={handleFetchSheet}
            disabled={isFetchingSheet || isSaving}
            className="w-full rounded-xl gap-2"
            variant="outline"
          >
            {isFetchingSheet ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            {isFetchingSheet ? 'Importando...' : 'Importar do Google Sheets'}
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/30 p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Armazenamento Incremental:</strong> Todos os dados são salvos permanentemente no cloud e acumulam ao longo do tempo.</p>
            <p><strong className="text-foreground">Importação Inteligente:</strong> Novos registros são adicionados e existentes são atualizados baseado no ID do post.</p>
            <p><strong className="text-foreground">Persistência:</strong> Seus dados ficam disponíveis mesmo após fechar o navegador.</p>
          </div>
        </div>
      </div>
    </div>
  );
}