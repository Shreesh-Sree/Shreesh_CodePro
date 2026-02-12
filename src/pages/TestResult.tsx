import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Code, ListChecks } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { testsApi } from '@/lib/api';
import type { AttemptResultDetail } from '@/lib/api';

export default function TestResult() {
  const { testId, userId } = useParams<{ testId: string; userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [detail, setDetail] = useState<AttemptResultDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!testId || !userId) return;
    testsApi
      .getResultByUser(testId, userId)
      .then(setDetail)
      .catch(() => toast({ title: 'Failed to load result', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [testId, userId, toast]);

  if (loading) return (
    <div className="page-container">
      <div className="flex justify-center py-12 text-muted-foreground animate-pulse">Loading result...</div>
    </div>
  );
  if (!detail) return (
    <div className="page-container">
      <div className="neo-card p-12 text-center text-muted-foreground">Result not found.</div>
    </div>
  );

  return (
    <div className="page-container max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/results/${testId}`)} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>Usage Result Detail</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Admin view of student performance
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-muted/40 px-4 py-2 rounded-md border border-border">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Score</span>
          <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            {detail.totalMarks != null && detail.maxMarks != null ? `${detail.totalMarks} / ${detail.maxMarks}` : '-'}
          </span>
        </div>
      </div>

      {detail.testType === 'MCQ' && detail.questions && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <ListChecks className="h-5 w-5" />
            <h2 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>MCQ Answers</h2>
          </div>
          {detail.questions.map((q, i) => (
            <div key={q.mcqQuestionId} className={`neo-card p-0 overflow-hidden ${q.correct ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
              <div className={`border-b px-6 py-4 flex items-start gap-3 ${q.correct ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
                <span className="text-sm font-mono text-muted-foreground mt-0.5">Q{i + 1}.</span>
                <div className="flex-1">
                  <h3 className="text-base font-medium tracking-tight mb-2">{q.question}</h3>
                  <div className="flex items-center gap-2 text-xs">
                    {q.correct ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle className="h-3 w-3" /> Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                        <XCircle className="h-3 w-3" /> Incorrect
                      </span>
                    )}
                    <span className="text-muted-foreground mx-1">•</span>
                    <span className="text-muted-foreground">Marks: {q.marksAwarded ?? 0} / {q.maxMarks}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {q.options.map((opt) => {
                  const isSelected = q.selectedOptionIds.includes(opt.id);
                  const isCorrectAnswer = q.correctOptionIds.includes(opt.id);
                  let styleClass = "border-border bg-card";
                  if (isCorrectAnswer) styleClass = "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20";
                  else if (isSelected && !isCorrectAnswer) styleClass = "border-rose-500/50 bg-rose-500/10 ring-1 ring-rose-500/20";

                  return (
                    <div key={opt.id} className={`flex items-center justify-between p-3 rounded-md border ${styleClass}`}>
                      <span className={`text-sm ${isCorrectAnswer ? 'font-medium text-emerald-700 dark:text-emerald-400' : isSelected ? 'font-medium text-rose-700 dark:text-rose-400' : ''}`}>
                        {opt.optionText}
                      </span>
                      <div className="flex items-center gap-2">
                        {isCorrectAnswer && <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Correct Answer</span>}
                        {isSelected && !isCorrectAnswer && <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Student Selection</span>}
                        {isSelected && isCorrectAnswer && <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Student Selection</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {detail.testType === 'CODING' && detail.codingResults && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Code className="h-5 w-5" />
            <h2 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Coding Results</h2>
          </div>
          {detail.codingResults.map((r, i) => (
            <div key={r.problemId} className={`neo-card p-0 overflow-hidden ${r.success ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
              <div className={`border-b px-6 py-4 flex items-center justify-between ${r.success ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-muted-foreground">P{i + 1}.</span>
                  <h3 className="text-base font-medium tracking-tight">{r.title}</h3>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {r.success ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-medium">
                      <CheckCircle className="h-3.5 w-3.5" /> Passed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20 font-medium">
                      <XCircle className="h-3.5 w-3.5" /> Failed
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="rounded-md bg-muted/50 border border-border/50 p-4 font-mono text-sm overflow-x-auto">
                  <pre>{r.userCode || '// No code submitted'}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
