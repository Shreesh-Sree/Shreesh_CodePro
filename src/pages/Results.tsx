import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { testsApi } from '@/lib/api';
import type { ApiTest } from '@/lib/api';
import AdvancedPagination from '@/components/shared/AdvancedPagination';
import BallBouncingLoader from '@/components/ui/BallBouncingLoader';

export default function Results() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tests, setTests] = useState<ApiTest[]>([]);
  const [results, setResults] = useState<
    { attemptId: number; userId: string; name: string; email: string; rollNumber: string; attemptedAt: string; totalMarks: number | null; maxMarks: number | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(results.length / itemsPerPage);
  const paginatedResults = results.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    testsApi
      .list()
      .then((r) => setTests(r.tests))
      .catch(() => toast({ title: 'Failed to load tests', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (!testId) {
      setResults([]);
      return;
    }
    testsApi
      .getResults(testId)
      .then((r) => setResults(r.results))
      .catch(() => setResults([]));
  }, [testId]);

  const handlePublish = async (id: number) => {
    setPublishing(true);
    try {
      await testsApi.publishResults(String(id));
      toast({ title: 'Results published' });
      setTests((prev) => prev.map((t) => (t.id === id ? { ...t, resultsPublished: true } : t)));
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Failed to publish', variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-8">
      <BallBouncingLoader />
    </div>
  );

  if (testId && results.length >= 0) {
    const test = tests.find((t) => t.id === Number(testId));
    return (
      <div className="page-container">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/results')} className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
            ← Back to tests
          </Button>
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>{test?.name ?? 'Results'}</h1>
          {test && !test.resultsPublished && (
            <Button size="sm" disabled={publishing} onClick={() => handlePublish(test.id)}>
              {publishing ? 'Publishing...' : 'Publish results'}
            </Button>
          )}
        </div>

        <div className="neo-card p-0 overflow-hidden">
          <div className="border-b bg-muted/40 py-4 px-6">
            <h2 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Cumulative results</h2>
          </div>
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="px-6 py-3 font-medium">Name</TableHead>
                  <TableHead className="px-6 py-3 font-medium">Email</TableHead>
                  <TableHead className="px-6 py-3 font-medium">Roll no</TableHead>
                  <TableHead className="px-6 py-3 font-medium">Attempted at</TableHead>
                  <TableHead className="px-6 py-3 font-medium">Score</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedResults.map((r) => (
                  <TableRow key={r.attemptId} className="hover:bg-muted/30 border-b border-border/50 last:border-0">
                    <TableCell className="px-6">{r.name}</TableCell>
                    <TableCell className="px-6">{r.email}</TableCell>
                    <TableCell className="px-6">{r.rollNumber}</TableCell>
                    <TableCell className="px-6">{r.attemptedAt ? new Date(r.attemptedAt).toLocaleString() : '-'}</TableCell>
                    <TableCell className="px-6">
                      {r.totalMarks != null && r.maxMarks != null ? (
                        <span className="font-medium text-foreground">{r.totalMarks} <span className="text-muted-foreground text-xs">/ {r.maxMarks}</span></span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="px-6">
                      <Button variant="link" size="sm" onClick={() => navigate(`/results/${testId}/student/${r.userId}`)} className="text-primary hover:text-primary/80">
                        View detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="p-4 border-t bg-muted/10 flex justify-end">
                <AdvancedPagination
                  totalPages={totalPages}
                  initialPage={page}
                  onPageChange={setPage}
                  variant="rounded"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Results</h1>
        <p className="text-sm text-muted-foreground">View and publish test results.</p>
      </div>
      <div className="space-y-4">
        {tests.map((t) => (
          <div key={t.id} className="neo-card p-0 overflow-hidden hover:border-primary/20 transition-colors">
            <div className="flex flex-row items-center justify-between p-6">
              <div>
                <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>{t.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.resultsPublished ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-500 font-medium text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full">Published</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-500 font-medium text-xs bg-amber-500/10 px-2 py-0.5 rounded-full">Not published</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/results/${t.id}`)} className="border-border">
                  View results
                </Button>
                {t.status === 'SCHEDULED' && t.startTime && new Date(t.startTime) > new Date() && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/schedule/edit/${t.id}`)} className="border-border">
                    Edit / Reschedule
                  </Button>
                )}
                {!t.resultsPublished && (
                  <Button size="sm" disabled={publishing} onClick={() => handlePublish(t.id)}>
                    Publish
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {tests.length === 0 && (
        <div className="neo-card flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>No tests found.</p>
        </div>
      )}
    </div>
  );
}
