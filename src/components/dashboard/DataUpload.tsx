import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DataUploadProps {
  onDataUploaded: (type: 'csv' | 'xlsx', data: any[]) => void;
}

export function DataUpload({ onDataUploaded }: DataUploadProps) {
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
        // Process CSV - will be appended to existing data
        const text = await file.text();
        const Papa = (await import('papaparse')).default;
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        data = result.data;
      } else if (type === 'xlsx') {
        // Process XLSX - will replace existing data
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
        message: `${type.toUpperCase()} processado com sucesso! ${data.length} registros encontrados.`
      });
      toast.success(`${type.toUpperCase()} carregado com sucesso!`);
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
    if (file) {
      handleFileUpload(file, 'csv');
    }
  };

  const handleXLSXUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, 'xlsx');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload de Dados do Instagram
          </CardTitle>
          <CardDescription>
            Faça upload de arquivos CSV (incremental) ou XLSX (substituição total) com dados do Instagram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {uploadStatus.status && (
            <Alert className={uploadStatus.status === 'success' ? 'border-green-500 text-green-700 bg-green-50' : 'border-red-500 text-red-700 bg-red-50'}>
              {uploadStatus.status === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{uploadStatus.message}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CSV Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Arquivo CSV (Incremental)
                </CardTitle>
                <CardDescription>
                  Adiciona novos dados aos existentes. Use para atualizações periódicas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="csv-upload">Selecione arquivo CSV</Label>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      ref={csvInputRef}
                      onChange={handleCSVUpload}
                      disabled={isUploading}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={() => csvInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                    variant="outline"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    {isUploading ? 'Processando...' : 'Selecionar CSV'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* XLSX Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileSpreadsheet className="w-4 h-4 text-green-500" />
                  Arquivo XLSX (Substituição)
                </CardTitle>
                <CardDescription>
                  Substitui todos os dados existentes. Use para datasets completos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="xlsx-upload">Selecione arquivo XLSX</Label>
                    <Input
                      id="xlsx-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      ref={xlsxInputRef}
                      onChange={handleXLSXUpload}
                      disabled={isUploading}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={() => xlsxInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                    variant="outline"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                    )}
                    {isUploading ? 'Processando...' : 'Selecionar XLSX'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>CSV:</strong> Adiciona novos posts aos dados existentes. Ideal para atualizações incrementais.</p>
            <p><strong>XLSX:</strong> Substitui completamente os dados. Use quando tiver um dataset completo e atualizado.</p>
            <p>Certifique-se de que os arquivos contenham as colunas esperadas para o processamento correto.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}