import { useState, useEffect, type ComponentProps } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  User,
  GraduationCap,
  Question as HelpCircle,
  FileText
} from '@phosphor-icons/react';
import BallBouncingLoader from '@/components/ui/BallBouncingLoader';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/contexts/PermissionContext';
import { studentsApi, departmentsApi, usersApi } from '@/lib/api';
import type { ApiStudentProgress } from '@/lib/api';
import { getCachedDepartments, setCachedDepartments } from '@/lib/storage';

function resolveStudentId(paramId: string): string {
  const n = parseInt(paramId, 10);
  if (!Number.isNaN(n)) return String(n);
  return paramId;
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const hasMentorPermission = hasPermission('mentor:read') || hasPermission('mentor:create') || hasPermission('mentor:update') || hasPermission('mentor:delete');
  const studentId = id ? resolveStudentId(id) : '';
  const [student, setStudent] = useState<Awaited<ReturnType<typeof studentsApi.getById>>['student'] | null>(null);
  const [progress, setProgress] = useState<ApiStudentProgress | null>(null);
  const [deptName, setDeptName] = useState('');
  const [mentorName, setMentorName] = useState('—');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setError(null);
    studentsApi
      .getById(studentId)
      .then(({ student: s }) => {
        setStudent(s);
        if (s.departmentId) {
          const cached = getCachedDepartments() as { id: string; name: string }[] | null;
          const d = cached?.find((x) => x.id === s.departmentId);
          if (d) {
            setDeptName(d.name);
          } else {
            departmentsApi.list().then(({ departments }) => {
              const found = departments.find((x) => x.id === s.departmentId);
              setDeptName(found?.name ?? '');
              setCachedDepartments(departments);
            }).catch(() => { });
          }
        }
        if (s.mentorName != null && s.mentorName !== '') {
          setMentorName(s.mentorName);
        } else if (s.mentorId && hasMentorPermission) {
          usersApi.list().then(({ users }) => {
            const m = users.find((x) => x.id === s.mentorId);
            setMentorName(m?.name ?? '—');
          }).catch(() => { });
        } else if (s.mentorId) {
          setMentorName('—');
        }
        return studentsApi.getProgress(studentId);
      })
      .then(({ progress: p }) => setProgress(p))
      .catch((e) => {
        setError(e?.message ?? 'Failed to load');
        setStudent(null);
      })
      .finally(() => setLoading(false));
  }, [studentId, hasMentorPermission]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex justify-center py-12">
          <BallBouncingLoader />
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="page-container">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/students')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-muted-foreground">{error || 'Student not found'}</p>
        </div>
      </div>
    );
  }

  const questionsSolved = progress?.questionsSolved ?? 0;
  const totalAttempts = progress?.totalAttempts ?? 0;
  const questionsPct = totalAttempts > 0 ? (questionsSolved / totalAttempts) * 100 : 0;

  return (
    <div className="page-container">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/students')} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>Student Progress</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {student.name} — {student.email}
          </p>
        </div>
      </div>

      <div className="neo-card p-0 mb-8 overflow-hidden">
        <div className="border-b bg-muted/30 px-6 py-4">
          <h3 className="text-lg font-medium tracking-tight flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <User className="h-5 w-5 text-primary" />
            Student Information
          </h3>
        </div>
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">Name</p>
              <p className="font-medium text-base">{student.name}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">Email</p>
              <p className="font-medium text-base truncate" title={student.email}>{student.email}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Roll Number</p>
              <p className="font-medium text-base font-mono text-muted-foreground">{student.rollNumber || '—'}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</p>
              <p className="font-medium text-base">{deptName || '—'}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mentor</p>
              <p className="font-medium text-base">{mentorName}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
              <StatusBadge status={(student.status ?? 'active') as ComponentProps<typeof StatusBadge>['status']} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <div className="neo-card p-6 flex flex-col justify-between hover:border-primary/30 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Questions Solved</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight">{questionsSolved}</span>
                <span className="text-sm text-muted-foreground">/ {totalAttempts || '—'}</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <Progress value={questionsPct} className="h-1.5 bg-muted" />
          </div>
        </div>

        <div className="neo-card p-6 flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Submissions</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight">{totalAttempts}</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>

        {progress?.tests != null && (
          <>
            <div className="neo-card p-6 flex flex-col justify-between hover:border-blue-500/30 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tests Completed</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight">{progress.tests.completed}</span>
                    <span className="text-sm text-muted-foreground">/ {progress.tests.attempted} attempted</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="neo-card p-6 flex flex-col justify-between hover:border-violet-500/30 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Test Breakdown</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tracking-tight">{progress.tests.codingTestsCompleted}<span className="text-sm font-normal text-muted-foreground ml-1">Coding</span></span>
                    <span className="text-muted-foreground px-1">·</span>
                    <span className="text-2xl font-semibold tracking-tight">{progress.tests.mcqTestsCompleted}<span className="text-sm font-normal text-muted-foreground ml-1">MCQ</span></span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {progress.tests.codingTestsAttempted} Coding attempted, {progress.tests.mcqTestsAttempted} MCQ attempted
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-violet-600" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="neo-card p-0 overflow-hidden mb-8">
        <div className="border-b bg-muted/30 px-6 py-4">
          <h3 className="text-lg font-medium tracking-tight flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <BookOpen className="h-5 w-5 text-primary" />
            Practice Progress
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Overall correctness rate on practice problems</p>
        </div>
        <div className="p-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Correctness</span>
            <span className="font-medium">{questionsPct.toFixed(0)}%</span>
          </div>
          <Progress value={questionsPct} className="h-2 bg-muted" />
        </div>
      </div>

      {progress?.courses && Array.isArray(progress.courses) && progress.courses.length > 0 && (
        <div className="neo-card p-0 overflow-hidden">
          <div className="border-b bg-muted/30 px-6 py-4">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
              <GraduationCap className="h-5 w-5 text-primary" />
              Courses
            </h3>
          </div>
          <div className="p-6">
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded-md border border-border/50">
              {JSON.stringify(progress.courses, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
