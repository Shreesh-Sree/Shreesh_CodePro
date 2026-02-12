import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { testsApi, testAttemptsApi } from '@/lib/api';
import type { ApiTest } from '@/lib/api';
import {
  CalendarCheck as CalendarClock,
  CaretDown as ChevronDown,
  CaretRight as ChevronRight,
  ArrowSquareOut as ExternalLink,
  PlusCircle,
  Warning as AlertTriangle
} from '@phosphor-icons/react';
import BallBouncingLoader from '@/components/ui/BallBouncingLoader';

type TestStatus = 'upcoming' | 'live' | 'past';

function getStatus(test: ApiTest): TestStatus {
  const now = new Date();
  const start = test.startTime ? new Date(test.startTime) : null;
  const end = test.endTime ? new Date(test.endTime) : null;
  if (!start || !end) return 'past';
  if (now < start) return 'upcoming';
  if (now > end) return 'past';
  return 'live';
}

const MALPRACTICE_LABELS: Record<string, string> = {
  tab_switch: 'Navigated (tab/window)',
  console: 'Console opened',
  logged_out: 'Logged out',
  fullscreen_exit: 'Fullscreen exited',
  copy_paste: 'Copy/Paste',
  context_menu: 'Context menu',
  tab_limit_exceeded: 'Flagged (exceeded tab limit)',
};

export default function TestsManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tests, setTests] = useState<ApiTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTestId, setExpandedTestId] = useState<number | null>(null);
  const [results, setResults] = useState<
    {
      attemptId: number;
      userId: string;
      name: string;
      email: string;
      rollNumber: string;
      attemptedAt: string;
      totalMarks: number | null;
      maxMarks: number | null;
      navigationOverride?: number;
      malpractice?: { type: string; createdAt: string }[];
    }[]
  >([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [increasingNav, setIncreasingNav] = useState<number | null>(null);

  useEffect(() => {
    testsApi
      .listAll()
      .then((r) => setTests(r.tests))
      .catch(() => toast({ title: 'Failed to load tests', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (expandedTestId == null) {
      setResults([]);
      return;
    }
    setLoadingResults(true);
    testsApi
      .getResults(String(expandedTestId))
      .then((r) => setResults(r.results))
      .catch(() => setResults([]))
      .finally(() => setLoadingResults(false));
  }, [expandedTestId]);

  const toggleExpand = (testId: number) => {
    setExpandedTestId((prev) => (prev === testId ? null : testId));
  };

  const handlePublish = async (e: React.MouseEvent, testId: number) => {
    e.stopPropagation();
    setPublishing(true);
    try {
      await testsApi.publishResults(String(testId));
      toast({ title: 'Results published' });
      setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, resultsPublished: true } : t)));
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to publish', variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const handleIncreaseNav = async (attemptId: number) => {
    setIncreasingNav(attemptId);
    try {
      await testAttemptsApi.increaseNavigationOverride(attemptId, 1);
      toast({ title: 'Navigation allowance increased by 1' });
      if (expandedTestId != null) {
        const r = await testsApi.getResults(String(expandedTestId));
        setResults(r.results);
      }
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Failed to update', variant: 'destructive' });
    } finally {
      setIncreasingNav(null);
    }
  };

  const grouped = {
    upcoming: tests.filter((t) => getStatus(t) === 'upcoming'),
    live: tests.filter((t) => getStatus(t) === 'live'),
    past: tests.filter((t) => getStatus(t) === 'past'),
  };

  if (loading) return (
    <div className="flex justify-center py-8">
      <BallBouncingLoader />
    </div>
  );

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-medium tracking-tight mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Tests</h1>
        <p className="text-sm text-muted-foreground">All tests — upcoming, live, and past. View results and manage malpractice flags.</p>
      </div>

      {(['upcoming', 'live', 'past'] as const).map((key) => {
        const list = grouped[key];
        const label = key === 'upcoming' ? 'Upcoming' : key === 'live' ? 'Live' : 'Past';
        if (list.length === 0) return null;
        return (
          <div key={key} className="mb-8 last:mb-0">
            <h2 className="text-lg font-medium mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
              <CalendarClock className="h-5 w-5 text-primary" />
              {label} <span className="text-sm font-normal text-muted-foreground ml-1">({list.length})</span>
            </h2>
            <div className="space-y-3">
              {list.map((test) => {
                const isExpanded = expandedTestId === test.id;
                const status = getStatus(test);
                const canEdit = status === 'upcoming';
                return (
                  <div key={test.id} className="neo-card p-0 overflow-hidden">
                    <div
                      className="cursor-pointer p-4 hover:bg-muted/30 transition-colors flex flex-wrap items-center justify-between gap-4"
                      onClick={() => toggleExpand(test.id)}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-transparent text-muted-foreground">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        <div className="min-w-0 grid gap-1">
                          <h3 className="text-base font-medium leading-none truncate">{test.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {test.startTime && test.endTime
                              ? `${new Date(test.startTime).toLocaleString()} – ${new Date(test.endTime).toLocaleString()}`
                              : '—'}
                          </p>
                        </div>
                        <Badge variant={status === 'live' ? 'default' : status === 'upcoming' ? 'secondary' : 'outline'} className="ml-2 font-normal rounded-full px-2.5">
                          {status}
                        </Badge>
                        <Badge variant="outline" className="font-normal rounded-full text-xs bg-muted/50 border-transparent">{test.testType || 'CODING'}</Badge>
                        {test.resultsPublished && (
                          <Badge variant="outline" className="text-emerald-500 bg-emerald-500/10 border-emerald-500/20 rounded-full font-normal text-xs">Published</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/results/${test.id}`)} className="border-border">
                          <ExternalLink className="h-3.5 w-3.5 mr-2" />
                          Results
                        </Button>
                        {canEdit && (
                          <Button variant="outline" size="sm" onClick={() => navigate(`/schedule/edit/${test.id}`)} className="border-border">
                            Edit
                          </Button>
                        )}
                        {!test.resultsPublished && (status === 'past' || status === 'live') && (
                          <Button
                            size="sm"
                            disabled={publishing}
                            onClick={(e) => handlePublish(e, test.id)}
                          >
                            Publish
                          </Button>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border/50 bg-muted/10 p-4 animate-in slide-in-from-top-2 duration-200">
                        {loadingResults ? (
                          <div className="flex justify-center py-8 text-muted-foreground text-sm">Loading results...</div>
                        ) : results.length === 0 ? (
                          <div className="flex justify-center py-8 text-muted-foreground text-sm">No completed attempts yet.</div>
                        ) : (
                          <>
                            {/* Mobile Card View */}
                            <div className="sm:hidden space-y-4">
                              {results.map((r) => {
                                const hasMalpractice = (r.malpractice?.length ?? 0) > 0;
                                const isFlagged = (r.malpractice ?? []).some((m) => m.type === 'tab_limit_exceeded');
                                return (
                                  <div key={r.attemptId} className={`bg-card border border-border rounded-xl p-4 shadow-sm space-y-3 ${isFlagged ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-foreground">{r.name}</span>
                                        {isFlagged && (
                                          <Badge variant="destructive" className="shrink-0 rounded-full px-1.5 py-0 text-[10px]">Flagged</Badge>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground"
                                        onClick={() => navigate(`/results/${test.id}/student/${r.userId}`)}
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div className="text-muted-foreground">Email</div>
                                      <div className="text-right truncate">{r.email}</div>

                                      <div className="text-muted-foreground">Roll No</div>
                                      <div className="text-right">{r.rollNumber}</div>

                                      <div className="text-muted-foreground">Score</div>
                                      <div className="text-right font-medium">
                                        {r.totalMarks != null && r.maxMarks != null ? (
                                          <span>{r.totalMarks} <span className="text-muted-foreground text-xs font-normal">/ {r.maxMarks}</span></span>
                                        ) : '—'}
                                      </div>

                                      <div className="text-muted-foreground">Attempted</div>
                                      <div className="text-right text-xs">
                                        {r.attemptedAt ? new Date(r.attemptedAt).toLocaleString() : '—'}
                                      </div>
                                    </div>

                                    {hasMalpractice && (
                                      <div className="pt-2 border-t border-border/50">
                                        <div className="flex flex-wrap gap-1 items-center">
                                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mr-1" />
                                          {(r.malpractice ?? []).map((m, i) => (
                                            <Badge key={i} variant="destructive" className="text-[10px] px-1.5 py-0 rounded-full font-normal opacity-80">
                                              {MALPRACTICE_LABELS[m.type] ?? m.type}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="pt-2 flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={increasingNav === r.attemptId}
                                        onClick={() => handleIncreaseNav(r.attemptId)}
                                        title="Allow one more navigation for this attempt"
                                        className="h-8 px-2 text-xs"
                                      >
                                        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                                        Increase Nav Limit
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden sm:block rounded-md border bg-card">
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent border-b border-border/50">
                                    <TableHead className="h-10">Name</TableHead>
                                    <TableHead className="h-10">Email</TableHead>
                                    <TableHead className="h-10">Roll no</TableHead>
                                    <TableHead className="h-10">Attempted at</TableHead>
                                    <TableHead className="h-10">Score</TableHead>
                                    <TableHead className="h-10">Malpractice</TableHead>
                                    <TableHead className="h-10 text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {results.map((r) => {
                                    const hasMalpractice = (r.malpractice?.length ?? 0) > 0;
                                    const isFlagged = (r.malpractice ?? []).some((m) => m.type === 'tab_limit_exceeded');
                                    return (
                                      <TableRow key={r.attemptId} className={`border-b border-border/50 last:border-0 hover:bg-muted/30 ${isFlagged ? 'bg-destructive/5' : ''}`}>
                                        <TableCell className="font-medium">
                                          <div className="flex items-center gap-2">
                                            {r.name}
                                            {isFlagged && (
                                              <Badge variant="destructive" className="shrink-0 rounded-full px-1.5 py-0 text-[10px]">Flagged</Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>{r.email}</TableCell>
                                        <TableCell>{r.rollNumber}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                          {r.attemptedAt ? new Date(r.attemptedAt).toLocaleString() : '—'}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          {r.totalMarks != null && r.maxMarks != null ? (
                                            <span>{r.totalMarks} <span className="text-muted-foreground text-xs font-normal">/ {r.maxMarks}</span></span>
                                          ) : '—'}
                                        </TableCell>
                                        <TableCell>
                                          {hasMalpractice ? (
                                            <div className="flex flex-wrap gap-1 items-center">
                                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                              {(r.malpractice ?? []).map((m, i) => (
                                                <Badge key={i} variant="destructive" className="text-[10px] px-1.5 py-0 rounded-full font-normal opacity-80">
                                                  {MALPRACTICE_LABELS[m.type] ?? m.type}
                                                </Badge>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              variant="link"
                                              size="sm"
                                              onClick={() => navigate(`/results/${test.id}/student/${r.userId}`)}
                                              className="text-primary h-auto p-0"
                                            >
                                              Detail
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              disabled={increasingNav === r.attemptId}
                                              onClick={() => handleIncreaseNav(r.attemptId)}
                                              title="Allow one more navigation for this attempt"
                                              className="h-8 w-8 p-0 ml-2"
                                            >
                                              <PlusCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                              <span className="sr-only">Increase nav</span>
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {tests.length === 0 && (
        <div className="neo-card flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>No tests found.</p>
        </div>
      )}
    </div>
  );
}
