import { useState, useEffect, useRef } from 'react';
import {
  Buildings, SquaresFour, Users, GraduationCap,
  TrendUp, UserPlus, FileText,
  Medal, Target,
  Pulse, Shield,
  CheckCircle,
  Clock
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Can } from '@/contexts/PermissionContext';
import { statsApi, type ApiStats } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BentoGrid, BentoGridItem } from '@/components/shared/BentoGrid';

/* ═══════════════════════════════════════════════
 * Bento-Infused Dashboard (Pro Max Clean)
 * ═══════════════════════════════════════════════ */

// ── Counter ──
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>();
  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);
  return <span>{display.toLocaleString()}</span>;
}

// ── Sparkline ──
function Sparkline({ data, colorClass = "text-primary", height = 40 }: {
  data: number[]; colorClass?: string; height?: number;
}) {
  const w = 120, h = height;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 6) - 3,
  }));

  let path = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.4;
    const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) * 0.4;
    path += ` C${cp1x},${pts[i - 1].y} ${cp2x},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  const area = `${path} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-full opacity-80", colorClass)} preserveAspectRatio="none">
      <path d={area} fill="currentColor" fillOpacity="0.1" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="currentColor" />
    </svg>
  );
}

// ── Progress Ring ──
function ProgressRing({ value, size = 52, strokeWidth = 5, colorClass = "text-primary", label }: {
  value: number; size?: number; strokeWidth?: number; colorClass?: string; label: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90 text-muted/20">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
            className={cn("transition-all duration-1000 ease-out", colorClass)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-foreground">{value}%</span>
        </div>
      </div>
      <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">{label}</span>
    </div>
  );
}

// ── Area Chart ──
function AreaChart({ data, height = 180 }: {
  data: { label: string; v1: number; v2: number }[];
  height?: number;
}) {
  const w = 600, h = height, pad = 24;
  const maxVal = Math.max(...data.map(d => Math.max(d.v1, d.v2)), 1);

  const toPoints = (key: 'v1' | 'v2') =>
    data.map((d, i) => ({
      x: pad + (i / (data.length - 1)) * (w - pad * 2),
      y: h - pad - (d[key] / maxVal) * (h - pad * 2),
    }));

  const smoothPath = (points: { x: number; y: number }[]) => {
    if (!points || points.length < 2) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const prev = points[i - 1];
      const controlX = (prev.x + point.x) / 2;
      path += ` C ${controlX} ${prev.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
    }
    return path;
  };

  const pts1 = toPoints('v1');
  const line1 = smoothPath(pts1);
  const area1 = `${line1} L${pts1[pts1.length - 1].x},${h - pad} L${pts1[0].x},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full text-primary" preserveAspectRatio="xMidYMid meet">
      <path d={area1} fill="currentColor" fillOpacity="0.1" />
      <path d={line1} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Simple X-Axis Line */}
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
    </svg>
  );
}

// ── Helpers ──
const isDeptScoped = (role?: string, deptId?: string) =>
  (role === 'department_admin' || role === 'staff') && !!deptId;

const statLabel = (role?: string, deptId?: string, key?: string) => {
  if (key === 'colleges') return isDeptScoped(role, deptId) ? 'My Campus' : 'Total Colleges';
  if (key === 'departments') return isDeptScoped(role, deptId) ? 'Department' : 'Departments';
  if (key === 'users') return 'Active Users';
  return key;
};

// ═══════════════════════════════════════════════
// ── DASHBOARD ──
// ═══════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ApiStats | null>(null);

  useEffect(() => {
    statsApi.get().then(setStats).catch(() => setStats(null));
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  const chartData = stats?.chartData || [];

  const activityItems = (stats?.activity || []).map(item => {
    let Icon = FileText;
    let colorClass = 'text-muted-foreground';
    let bgClass = 'bg-muted';

    const type = (item.type || '').toLowerCase();
    const label = item.label.toLowerCase();
    if (label.includes('user') || label.includes('student') || type.includes('user')) {
      Icon = UserPlus; colorClass = 'text-success'; bgClass = 'bg-success/10';
    } else if (label.includes('test') || type.includes('test')) {
      Icon = FileText; colorClass = 'text-blue-500'; bgClass = 'bg-blue-500/10';
    } else if (label.includes('achievement') || label.includes('badge')) {
      Icon = Medal; colorClass = 'text-warning'; bgClass = 'bg-warning/10';
    } else if (label.includes('college')) {
      Icon = Buildings; colorClass = 'text-primary'; bgClass = 'bg-primary/10';
    }
    return { ...item, icon: Icon, colorClass, bgClass };
  });

  const leaderboard = stats?.leaderboard || [];

  return (
    <div className="min-h-full">
      <div className="relative z-[1] p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* ═══ HERO ═══ */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
              {greeting}, {user?.name || 'there'}
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
              <Shield className="w-3.5 h-3.5 text-primary" weight="fill" />
              Secure Education Command Center
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Badge */}
            <div className="px-3 py-1.5 rounded-xl bg-card border border-border flex items-center gap-2 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </section>

        {/* ═══ BENTO METRIC ROW (4 Cols) ═══ */}
        <BentoGrid>
          <Can permission="college:read">
            <BentoGridItem
              size="small"
              title={statLabel(user?.role, user?.departmentId, 'colleges')}
              description="Managed campuses"
              icon={<Buildings size={20} weight="fill" />}
              header={
                <div className="flex items-end justify-between mt-2">
                  <span className="text-3xl font-bold text-foreground tracking-tighter">
                    <AnimatedNumber value={stats?.colleges ?? 0} />
                  </span>
                  <div className="h-8 w-20">
                    <Sparkline data={stats?.sparklines?.colleges || [0, 0, 0, 0, 0, 0]} colorClass="text-primary" />
                  </div>
                </div>
              }
            />
          </Can>
          <Can permissions={['department:read', 'department:read_own']}>
            <BentoGridItem
              size="small"
              title={statLabel(user?.role, user?.departmentId, 'departments')}
              description="Academic units"
              icon={<SquaresFour size={20} weight="fill" />}
              header={
                <div className="flex items-end justify-between mt-2">
                  <span className="text-3xl font-bold text-foreground tracking-tighter">
                    <AnimatedNumber value={stats?.departments ?? 0} />
                  </span>
                  <div className="h-8 w-20">
                    <Sparkline data={stats?.sparklines?.departments || [0, 0, 0, 0, 0, 0]} colorClass="text-emerald-500" />
                  </div>
                </div>
              }
            />
          </Can>
          <Can permissions={['user:read', 'mentor:read']}>
            <BentoGridItem
              size="small"
              title={statLabel(user?.role, user?.departmentId, 'users')}
              description="System administrators"
              icon={<Users size={20} weight="fill" />}
              header={
                <div className="flex items-end justify-between mt-2">
                  <span className="text-3xl font-bold text-foreground tracking-tighter">
                    <AnimatedNumber value={stats?.users ?? 0} />
                  </span>
                  <div className="h-8 w-20">
                    <Sparkline data={stats?.sparklines?.users || [0, 0, 0, 0, 0, 0]} colorClass="text-blue-500" />
                  </div>
                </div>
              }
            />
          </Can>
          <Can permission="student:read">
            <BentoGridItem
              size="small"
              title="Students"
              description="Active learners"
              icon={<GraduationCap size={20} weight="fill" />}
              header={
                <div className="flex items-end justify-between mt-2">
                  <span className="text-3xl font-bold text-foreground tracking-tighter">
                    <AnimatedNumber value={stats?.students ?? 0} />
                  </span>
                  <div className="h-8 w-20">
                    <Sparkline data={stats?.sparklines?.students || [0, 0, 0, 0, 0, 0]} colorClass="text-accent" />
                  </div>
                </div>
              }
            />
          </Can>
        </BentoGrid>

        {/* ═══ CHART (3 Cols) + ACTIVITY (1 Col) ═══ */}
        <BentoGrid>
          <BentoGridItem
            size="medium"
            className="md:col-span-4 lg:col-span-3 min-h-[16rem]"
            title="Performance Curve"
            description="Institutional growth outcomes"
            icon={<TrendUp size={20} weight="fill" />}
            header={
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Tests</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Projection</span>
                  </div>
                </div>
                <div className="relative h-[160px] w-full mt-2">
                  {chartData.length > 0 ? (
                    <AreaChart data={chartData} height={200} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
                      No activity data available
                    </div>
                  )}
                </div>
              </div>
            }
          />

          <BentoGridItem
            size="small"
            className="md:col-span-4 lg:col-span-1"
            title="Live Activity"
            description="Recent events"
            icon={<Pulse size={20} className="animate-pulse text-emerald-500" weight="fill" />}
            header={
              <div className="space-y-2 mt-2">
                {activityItems.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group/item border border-transparent hover:border-border/50">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", item.bgClass)}>
                      <item.icon className={cn("h-4 w-4", item.colorClass)} weight="fill" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground/50">{item.time}</span>
                  </div>
                ))}
              </div>
            }
          />
        </BentoGrid>

        {/* ═══ BOTTOM ROW (2 Cols Leaderboard, 1 Col Goals, 1 Col Health) ═══ */}
        <BentoGrid>
          <BentoGridItem
            title="Top Achievers"
            description="Leading performers"
            icon={<Medal size={20} className="text-accent" weight="fill" />}
            size="medium"
            className="md:col-span-2"
            header={
              <div className="space-y-2.5 mt-2">
                {leaderboard.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-transparent hover:border-border/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] font-black",
                        i === 0 ? "bg-accent text-accent-foreground" : i === 1 ? "bg-muted-foreground/30 text-foreground" : "bg-orange-500/20 text-orange-600 dark:text-orange-400")}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{s.name}</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{s.score}</span>
                  </div>
                ))}
              </div>
            }
          />

          <BentoGridItem
            title="Goals"
            description="KPI targets"
            icon={<Target size={20} className="text-primary" weight="fill" />}
            size="small"
            header={
              <div className="flex items-center justify-around pt-2">
                <ProgressRing value={stats?.goals?.passRate ?? 0} colorClass="text-primary" label="Pass" />
                <ProgressRing value={stats?.goals?.attendance ?? 0} colorClass="text-blue-500" label="Attend" />
              </div>
            }
          />

          <BentoGridItem
            title="System"
            description="Health status"
            icon={<Shield size={20} className="text-emerald-500" weight="fill" />}
            size="small"
            header={
              <div className="space-y-3 mt-1">
                <div className="flex items-center justify-between bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Gateway</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
                </div>
                <div className="flex items-center justify-between bg-primary/5 p-2 rounded-lg border border-primary/10">
                  <span className="text-[10px] font-bold text-primary uppercase">Active Tests</span>
                  <span className="text-xs font-black text-primary">{stats?.vitals?.activeTests ?? 0}</span>
                </div>
              </div>
            }
          />
        </BentoGrid>

      </div>
    </div>
  );
}
