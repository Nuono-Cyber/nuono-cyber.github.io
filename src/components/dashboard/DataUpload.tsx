import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface DataUploadProps {
  onDataUploaded: (type: 'csv' | 'sheet', data: any[]) => void;
  isSaving?: boolean;
  totalRecords?: number;
  onRefresh?: () => void;
}

export function DataUpload({ onDataUploaded, isSaving = false, totalRecords = 0, onRefresh }: DataUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setMessage(null);
    try {
      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      const data = result.data;
      onDataUploaded('csv', data);
      setIsError(false);
      setMessage(`CSV processado com ${data.length} registros.`);
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message || 'Erro ao processar CSV');
      toast.error('Erro ao processar CSV');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file);
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

      <div className="rounded-xl border p-4 space-y-3">
        <Label htmlFor="csv-upload">Importar CSV</Label>
        <Input id="csv-upload" type="file" accept=".csv" ref={csvInputRef} onChange={handleCSVUpload} disabled={isUploading || isSaving} />
        <Button onClick={() => csvInputRef.current?.click()} disabled={isUploading || isSaving} className="w-full">
          {isUploading || isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Enviar CSV
        </Button>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <FileText className="h-3 w-3" />
          Integração Google Sheets removida na migração para SQLite.
        </div>
      </div>
    </div>
  );
}
