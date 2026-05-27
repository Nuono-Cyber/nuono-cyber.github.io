import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

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
  const sampleInputRef = useRef<HTMLInputElement>(null);
  const incrementInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">Banco SQLite</div>
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
    </div>
  );
}
