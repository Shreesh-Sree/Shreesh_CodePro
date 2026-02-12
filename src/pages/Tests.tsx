import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { testsApi } from '@/lib/api';
import type { ApiTest } from '@/lib/api';
import { Warning as AlertTriangle, Clock, CalendarBlank as Calendar } from '@phosphor-icons/react';

export default function Tests() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [tests, setTests] = useState<ApiTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [testToStart, setTestToStart] = useState<ApiTest | null>(null);
  const [starting, setStarting] = useState(false);
  const justSubmitted = (location.state as { justSubmitted?: boolean })?.justSubmitted === true;

  useEffect(() => {
    testsApi
      .forStudent()
      .then((r) => setTests(r.tests))
      .catch(() => toast({ title: 'Failed to load tests', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleStartClick = (test: ApiTest) => {
    setTestToStart(test);
  };

  const handleConfirmStart = async () => {
    if (!testToStart) return;
    setStarting(true);
    try {
      const r = await testsApi.startAttempt(String(testToStart.id));
      setTestToStart(null);
      navigate(`/tests/${testToStart.id}/attempt`, { state: { attemptId: r.attemptId } });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed to start', variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  const isLive = (t: ApiTest) => {
    const status = t.displayStatus ?? t.status;
    if (status === 'LIVE') return true;
    if (t.startTime && t.endTime) {
      const now = new Date();
      const start = new Date(t.startTime);
      const end = new Date(t.endTime);
      return now >= start && now <= end;
    }
    return false;
  };

  const canStart = (t: ApiTest) => isLive(t);

  if (loading) return <div className="flex justify-center py-8 text-muted-foreground animate-pulse">Loading...</div>;

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-medium tracking-tight mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Tests</h1>
        <p className="text-sm text-muted-foreground">Your scheduled and live tests.</p>
      </div>
      {justSubmitted && (
        <div className="mb-6 rounded-lg border bg-muted/50 px-4 py-3 text-center text-sm font-medium text-foreground">
          Thank you for submitting your test. It will no longer appear here. Check the Result menu once results are published.
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {tests.map((t) => (
          <div key={t.id} className="neo-card p-0 overflow-hidden flex flex-col h-full hover:border-primary/20 transition-colors">
            <div className="p-6 flex-1">
              <div className="flex flex-row items-center justify-between mb-4">
                <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>{t.name}</h3>
                <Badge variant={canStart(t) ? 'default' : 'secondary'} className="rounded-full px-2.5 font-normal">
                  {t.displayStatus ?? t.status}
                </Badge>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-normal rounded-sm px-1.5 py-0 h-auto">{t.testType ?? 'Test'}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{t.startTime ? new Date(t.startTime).toLocaleDateString() : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {t.startTime ? new Date(t.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} – {t.endTime ? new Date(t.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted/30 border-t border-border/50 flex justify-end">
              {canStart(t) ? (
                <Button onClick={() => handleStartClick(t)} className="w-full sm:w-auto">Start test</Button>
              ) : (
                <Button variant="outline" disabled className="w-full sm:w-auto opacity-50 cursor-not-allowed">Not available</Button>
              )}
            </div>
          </div>
        ))}
      </div>
      {tests.length === 0 && (
        <div className="neo-card flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>No tests assigned.</p>
        </div>
      )}

      <Dialog open={!!testToStart} onOpenChange={(open) => !open && setTestToStart(null)}>
        <DialogContent className="neo-card-flat border border-border shadow-none max-w-lg sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-medium" style={{ fontFamily: 'var(--font-serif)' }}>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Test rules &amp; instructions
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-left pt-2">
                <p className="font-medium text-foreground">
                  Please read and confirm before starting <strong>{testToStart?.name}</strong>.
                </p>
                <p className="text-sm">
                  <strong>Indulging in malpractice more than {testToStart?.maxNavigations ?? 3} time(s)</strong> (e.g. switching tabs, opening other windows, or leaving the test screen) may <strong>end your test automatically</strong> or result in your attempt being flagged.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Do not switch to another tab or window during the test.</li>
                  <li>Do not open the browser developer console (F12 or Inspect).</li>
                  <li>Do not right-click to open the context menu.</li>
                  <li>Stay in full screen / test window until you submit.</li>
                  <li>You are allowed at most <strong>{testToStart?.maxNavigations ?? 3} navigation event(s)</strong> (e.g. accidental tab switch) before your test may be ended.</li>
                </ul>
                <p className="text-sm pt-1">
                  By clicking &quot;I understand, Start test&quot; you agree to these rules.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTestToStart(null)} disabled={starting} className="border-border">
              Cancel
            </Button>
            <Button onClick={handleConfirmStart} disabled={starting}>
              {starting ? 'Starting...' : 'I understand, Start test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
