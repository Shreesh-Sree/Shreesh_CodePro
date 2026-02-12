import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { testsApi } from '@/lib/api';
import { ChartBar, Clock, FileText } from '@phosphor-icons/react';

export default function MyResults() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tests, setTests] = useState<{ id: number; name: string; startTime: string | null; endTime: string | null; testType: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testsApi
      .myResults()
      .then((r) => setTests(r.tests))
      .catch(() => toast({ title: 'Failed to load results', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) return (
    <div className="page-container">
      <div className="flex justify-center py-12 text-muted-foreground animate-pulse">Loading results...</div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <ChartBar className="h-6 w-6 text-primary" />
            My Results
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Your published test results appear here.</p>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="neo-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ChartBar className="h-10 w-10 opacity-20 mb-4" />
          <p className="text-center">No results published yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Results will appear here after staff publish them.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <div key={t.id} className="neo-card p-0 flex flex-col overflow-hidden hover:border-primary/30 transition-colors">
              <div className="border-b bg-muted/30 px-6 py-4">
                <h3 className="text-base font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                  {t.name}
                </h3>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{t.testType ?? 'Test'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{t.startTime ? new Date(t.startTime).toLocaleString() : '—'}</span>
                  </div>
                </div>
                <Button className="w-full mt-2" variant="outline" onClick={() => navigate(`/tests/${t.id}/my-result`)}>
                  View result
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
