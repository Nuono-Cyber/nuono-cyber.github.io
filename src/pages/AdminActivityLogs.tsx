import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_email: string;
  user_name: string | null;
}

export default function AdminActivityLogs() {
  const { isSuperAdmin } = useAuthContext();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isSuperAdmin) fetchLogs();
  }, [isSuperAdmin]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const { rows } = await api.activity.list();
      setLogs(rows || []);
    } catch (error) {
      toast.error('Erro ao carregar logs');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <Card>
        <CardHeader>
          <CardTitle>Logs de Atividade</CardTitle>
          <CardDescription>{logs.length} registros</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.created_at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{log.user_name || log.user_email}</TableCell>
                    <TableCell><Badge>{log.action}</Badge></TableCell>
                    <TableCell>{log.details ? JSON.stringify(log.details) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
