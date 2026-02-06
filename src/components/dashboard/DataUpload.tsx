import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Database,
  Trash2,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';

interface DataUploadProps {
  onDataUploaded: (type: 'csv' | 'xlsx', data: any[]) => void;
  isSaving?: boolean;
  totalRecords?: number;
  onClearData?: () => void;
  onRefresh?: () => void;
}

export function DataUpload({ 
  onDataUploaded, 
  isSaving = false, 
  totalRecords = 0,
  onClearData,
  onRefresh
}: DataUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'csv' | 'xlsx' | null;
    status: 'success' | 'error' | null;
    message: string;
  }>({ type: null, status: null, message: '' });

  const csvInputRef = useRef<HTMLInputElement>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, type: 'csv' | 'xlsx') => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus({ type: null, status: null, message: '' });

    try {
      let data: any[] = [];

      if (type === 'csv') {
        const text = await file.text();
        const Papa = (await import('papaparse')).default;
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        data = result.data;
      } else if (type === 'xlsx') {
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      }

      onDataUploaded(type, data);
      setUploadStatus({
        type,
        status: 'success',
        message: `${type.toUpperCase()} processado! ${data.length} registros serão salvos no banco de dados.`
      });
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setUploadStatus({
        type,
        status: 'error',
        message: `Erro ao processar arquivo ${type.toUpperCase()}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
      toast.error(`Erro ao processar ${type.toUpperCase()}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file, 'csv');
  };

  const handleXLSXUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file, 'xlsx');
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
              <h2 className="text-lg font-semibold">Banco de Dados</h2>
              <p className="text-sm text-muted-foreground">
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
            {onClearData && totalRecords > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearData}
                disabled={isProcessing}
                className="gap-2 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Limpar
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
            Salvando dados no banco de dados...
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Upload */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-6 border-b border-border bg-gradient-to-br from-[hsl(var(--info))]/5 to-transparent">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[hsl(var(--info))]/10">
                <FileText className="w-5 h-5 text-[hsl(var(--info))]" />
              </div>
              <h3 className="font-semibold">CSV Incremental</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Adiciona novos dados aos existentes. Registros duplicados são atualizados.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <Label htmlFor="csv-upload" className="text-sm text-muted-foreground">
                Selecione arquivo CSV
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

        {/* XLSX Upload */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-6 border-b border-border bg-gradient-to-br from-[hsl(var(--success))]/5 to-transparent">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[hsl(var(--success))]/10">
                <FileSpreadsheet className="w-5 h-5 text-[hsl(var(--success))]" />
              </div>
              <h3 className="font-semibold">XLSX Substituição</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Substitui todos os dados existentes. Use para datasets completos.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <Label htmlFor="xlsx-upload" className="text-sm text-muted-foreground">
                Selecione arquivo XLSX
              </Label>
              <Input
                id="xlsx-upload"
                type="file"
                accept=".xlsx,.xls"
                ref={xlsxInputRef}
                onChange={handleXLSXUpload}
                disabled={isProcessing}
                className="mt-1 rounded-xl"
              />
            </div>
            <Button
              onClick={() => xlsxInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full rounded-xl gap-2"
              variant="outline"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isProcessing ? 'Processando...' : 'Importar XLSX'}
            </Button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-border bg-secondary/30 p-4">
        <div className="flex items-start gap-3">
          <HardDrive className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Armazenamento Persistente:</strong> Todos os dados são salvos no banco de dados e ficam disponíveis mesmo após fechar o navegador.</p>
            <p><strong className="text-foreground">CSV:</strong> Adiciona e atualiza registros existentes baseado no ID do post.</p>
            <p><strong className="text-foreground">XLSX:</strong> Substitui completamente os dados armazenados.</p>
          </div>
        </div>
      </div>
    </div>
  );
}