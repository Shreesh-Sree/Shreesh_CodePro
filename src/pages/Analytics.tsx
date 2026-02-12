import { useState, useEffect } from 'react';
import {
  ChartBar,
  Users,
  Student,
  ChalkboardTeacher,
  Buildings,
  TrendUp,
  TrendDown,
  Target,
  Pulse as Activity,
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  Exam,
  Briefcase,
  BookOpen,
  GraduationCap
} from '@phosphor-icons/react';
import { StatCard } from '@/components/shared/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsApi, statsApi, ApiStats } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';

const COLORS = ['hsl(261, 35%, 60%)', 'hsl(261, 35%, 70%)', 'hsl(261, 35%, 80%)', 'hsl(261, 35%, 90%)']; // Violet shades

function isDepartmentScoped(role: string | undefined, departmentId: string | undefined): boolean {
  if (!departmentId) return false;
  return role !== 'SUPERADMIN' && role !== 'ADMIN';
}

function getAnalyticsDescription(role: string | undefined, departmentId: string | undefined): string {
  if (isDepartmentScoped(role, departmentId)) return 'Student statistics for your department';
  if (role === 'MENTOR') return 'Statistics for your students';
  return 'Overview of system performance and student statistics';
}

export default function Analytics() {
  const { user } = useAuth();
  const [departmentDistribution, setDepartmentDistribution] = useState<{ department: string; count: number }[]>([]);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsApi.get(), statsApi.get()])
      .then(([analytics, statsData]) => {
        setDepartmentDistribution(analytics.departmentDistribution ?? []);
        setStats(statsData);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex justify-center py-12 text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  // Fallback values if stats are null (e.g. error or loading)
  const totalStudents = stats?.students ?? 0;
  const activeTests = stats?.vitals?.activeTests ?? 0;
  const placements = stats?.vitals?.placements ?? 0;
  const courses = stats?.vitals?.courses ?? 0;
  const avgScore = stats?.vitals?.avgScore ?? 0;

  const passRate = stats?.goals?.passRate ?? 0;
  const attendance = stats?.goals?.attendance ?? 0;
  const completion = stats?.goals?.completion ?? 0;
  const streak = stats?.goals?.streak ?? 0;

  return (
    <div className="page-container space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-foreground flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
            <ChartBar className="h-6 w-6 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {getAnalyticsDescription(user?.role, user?.departmentId)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-border/50">
          <Clock className="h-4 w-4" />
          <span>Last updated: just now</span>
        </div>
      </div>

      {/* Primary Vitals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={totalStudents.toLocaleString()}
          icon={Student}
          trend={{ value: stats?.trends?.students?.value ?? 0, isPositive: stats?.trends?.students?.positive ?? true }}
        />
        <StatCard
          title="Active Tests"
          value={activeTests}
          icon={Exam}
          className="border-blue-500/20 bg-blue-500/5"
        />
        <StatCard
          title="Placements"
          value={placements}
          icon={Briefcase}
          className="border-emerald-500/20 bg-emerald-500/5"
        />
        <StatCard
          title="Avg. Score"
          value={`${avgScore}%`}
          icon={Target}
          trend={{ value: 2.5, isPositive: true }}
          className="border-amber-500/20 bg-amber-500/5"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="neo-card p-0 overflow-hidden col-span-1">
          <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Department Distribution</h3>
              <p className="text-sm text-muted-foreground mt-1">Students per department</p>
            </div>
            <Buildings className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="department"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Students"
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="neo-card p-0 overflow-hidden col-span-1">
          <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Composition</h3>
              <p className="text-sm text-muted-foreground mt-1">Relative student distribution</p>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="department"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {departmentDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goals / Performance Metrics */}
        <div className="neo-card p-0 overflow-hidden lg:col-span-1">
          <div className="border-b bg-muted/30 px-6 py-4">
            <h3 className="text-lg font-medium tracking-tight flex items-center gap-2" style={{ fontFamily: 'var(--font-serif)' }}>
              <Target className="h-5 w-5 text-primary" />
              Performance Goals
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pass Rate</span>
                <span className="font-medium">{passRate}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${passRate}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Attendance</span>
                <span className="font-medium">{attendance}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${attendance}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Course Completion</span>
                <span className="font-medium">{completion}%</span>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all duration-1000" style={{ width: `${completion}%` }} />
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Activity Streak</p>
                  <p className="text-2xl font-bold">{streak} days</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats Table */}
        <div className="neo-card p-0 overflow-hidden lg:col-span-2">
          <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Detailed Statistics</h3>
            <Button variant="ghost" size="sm" className="hidden sm:flex">Export Data</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Students</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Percentage</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/3">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {departmentDistribution.map((dept, idx) => {
                  const percentage = totalStudents > 0 ? (dept.count / totalStudents) * 100 : 0;
                  return (
                    <tr key={idx} className="border-b last:border-0 border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground max-w-[200px] truncate" title={dept.department}>{dept.department}</td>
                      <td className="px-6 py-4 text-right text-muted-foreground">{dept.count}</td>
                      <td className="px-6 py-4 text-right text-muted-foreground">{percentage.toFixed(1)}%</td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: COLORS[idx % COLORS.length],
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {departmentDistribution.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Temporary Button component locally if needed or import
import { Button } from '@/components/ui/button';
