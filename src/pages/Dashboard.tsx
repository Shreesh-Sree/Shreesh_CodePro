import { useState, useEffect, useRef } from 'react';
import {
  Buildings, SquaresFour, Users, GraduationCap,
  TrendUp, UserPlus, FileText,
  ClipboardText, Medal, Target,
  ArrowUpRight, ArrowDownRight,
  BookOpen, Briefcase,
  Trophy, Fire,
  Pulse
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Can } from '@/contexts/PermissionContext';
import { statsApi, type ApiStats } from '@/lib/api';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════
 * Anthropic-inspired Dashboard
 * Serif headings, flat cards, 1px borders,
 * warm palette, generous whitespace
 * Accent: #8b6bc5 (violet)
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

// ── Sparkline (simple, no glow dot) ──
function Sparkline({ data, color = '#8b6bc5', gradientId, height = 44 }: {
  data: number[]; color?: string; gradientId: string; height?: number;
}) {
  const w = 180, h = height;
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
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={color} />
    </svg>
  );
}

// ── Progress Ring (clean, no outer glow) ──
function ProgressRing({ value, size = 72, strokeWidth = 5, color = '#8b6bc5', label }: {
  value: number; size?: number; strokeWidth?: number; color?: string; label: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-foreground">{value}<span className="text-[10px] text-muted-foreground">%</span></span>
        </div>
      </div>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

// ── Area Chart ──
function AreaChart({ data }: {
  data: { label: string; v1: number; v2: number }[];
}) {
  const w = 600, h = 180, pad = 28;
  const maxVal = Math.max(...data.map(d => Math.max(d.v1, d.v2)), 1);

  const toPoints = (key: 'v1' | 'v2') =>
    data.map((d, i) => ({
      x: pad + (i / (data.length - 1)) * (w - pad * 2),
      y: h - pad - (d[key] / maxVal) * (h - pad * 2),
    }));

  const smoothPath = (pts: { x: number; y: number }[]) => {
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C${cx},${pts[i - 1].y} ${cx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
    }
    return d;
  };

  const pts1 = toPoints('v1');
  const pts2 = toPoints('v2');
  const line1 = smoothPath(pts1);
  const line2 = smoothPath(pts2);
  const area1 = `${line1} L${pts1[pts1.length - 1].x},${h - pad} L${pts1[0].x},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b6bc5" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#8b6bc5" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Subtle grid */}
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1={pad} y1={h - pad - f * (h - pad * 2)} x2={w - pad} y2={h - pad - f * (h - pad * 2)}
          stroke="hsl(var(--border))" strokeWidth="0.5" />
      ))}
      <path d={area1} fill="url(#chartFill)" />
      <path d={line1} fill="none" stroke="#8b6bc5" strokeWidth="1.5" strokeLinecap="round" />
      <path d={line2} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeLinecap="round" strokeDasharray="4 4" />
      {pts1.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#8b6bc5" />
      ))}
      {data.map((d, i) => (
        <text key={`x-${i}`}
          x={pad + (i / (data.length - 1)) * (w - pad * 2)}
          y={h - 8} textAnchor="middle"
          fill="hsl(var(--muted-foreground))" fontSize="10" fontFamily="var(--font-sans)"
        >{d.label}</text>
      ))}
    </svg>
  );
}

// ── Helpers ──
function isDeptScoped(role?: string, deptId?: string) {
  return deptId ? role !== 'SUPERADMIN' && role !== 'ADMIN' : false;
}
function statLabel(role?: string, deptId?: string, key?: string) {
  if (isDeptScoped(role, deptId)) {
    if (key === 'users') return 'Mentors';
    if (key === 'departments') return 'Your Dept';
    if (key === 'colleges') return 'Your College';
  }
  if (role === 'MENTOR' && key === 'users') return 'Users';
  return key === 'users' ? 'Total Users' : key === 'departments' ? 'Departments' : 'Colleges';
}

// ── Metric Card ──
function MetricCard({ title, value, trend, icon: Icon, color, sparkData, gradientId, delay = 0 }: {
  title: string; value: number; trend: { value: number; positive: boolean };
  icon: React.ElementType; color: string; sparkData: number[]; gradientId: string; delay?: number;
}) {
  const palette: Record<string, { iconBg: string; iconText: string; hex: string }> = {
    violet: { iconBg: 'bg-[#8b6bc5]/12', iconText: 'text-[#8b6bc5]', hex: '#8b6bc5' },
    blue: { iconBg: 'bg-blue-500/10', iconText: 'text-blue-400', hex: '#60a5fa' },
    teal: { iconBg: 'bg-teal-500/10', iconText: 'text-teal-400', hex: '#2dd4bf' },
    slate: { iconBg: 'bg-slate-400/10', iconText: 'text-slate-400', hex: '#94a3b8' },
    amber: { iconBg: 'bg-amber-500/10', iconText: 'text-amber-400', hex: '#fbbf24' },
  };
  const c = palette[color] || palette.violet;

  return (
    <div className="neo-card animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("h-9 w-9 rounded-md flex items-center justify-center", c.iconBg)}>
          <Icon className={cn("h-[18px] w-[18px]", c.iconText)} />
        </div>
        <div className={cn("flex items-center gap-1 text-[11px] font-medium",
          trend.positive ? "text-emerald-400" : "text-red-400"
        )}>
          {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(trend.value)}%
        </div>
      </div>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-semibold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
        <AnimatedNumber value={value} />
      </p>
      {sparkData.some(v => v > 0) && (
        <div className="mt-4 h-11 -mx-6 -mb-6 overflow-hidden rounded-b-lg">
          <Sparkline data={sparkData} color={c.hex} gradientId={gradientId} />
        </div>
      )}
    </div>
  );
}


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

  const chartData = stats?.chartData?.length ? stats.chartData : [
    { label: 'Jan', v1: 0, v2: 0 }, { label: 'Feb', v1: 0, v2: 0 },
    { label: 'Mar', v1: 0, v2: 0 }, { label: 'Apr', v1: 0, v2: 0 },
  ];

  const activityItems = (stats?.activity || []).map(item => {
    let Icon = FileText;
    let color = 'text-muted-foreground';
    let bg = 'bg-secondary';

    const type = (item.type || '').toLowerCase();
    const label = item.label.toLowerCase();
    if (label.includes('user') || label.includes('student') || type.includes('user')) {
      Icon = UserPlus; color = 'text-emerald-400'; bg = 'bg-emerald-500/8';
    } else if (label.includes('test') || type.includes('test')) {
      Icon = FileText; color = 'text-blue-400'; bg = 'bg-blue-500/8';
    } else if (label.includes('achievement') || label.includes('badge')) {
      Icon = Medal; color = 'text-amber-400'; bg = 'bg-amber-500/8';
    } else if (label.includes('college')) {
      Icon = Buildings; color = 'text-[#8b6bc5]'; bg = 'bg-[#8b6bc5]/8';
    }
    return { ...item, icon: Icon, color, bg };
  });

  const leaderboard = stats?.leaderboard || [];

  return (
    <div className="min-h-full">
      <div className="relative z-[1] p-6 lg:p-8 space-y-6 max-w-[1480px] mx-auto">

        {/* ═══ HERO ═══ */}
        <section className="animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
            {greeting}, {user?.name || 'there'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
            Here's what's happening across your platform today.
          </p>
        </section>

        {/* ═══ METRICS ═══ */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          <Can permission="college:read">
            <MetricCard
              title={statLabel(user?.role, user?.departmentId, 'colleges')}
              value={stats?.colleges ?? 0}
              icon={Buildings} color="violet"
              trend={stats?.trends?.colleges || { value: 0, positive: true }}
              sparkData={stats?.sparklines?.colleges || [0, 0, 0, 0, 0, 0]}
              gradientId="sg-violet" delay={0}
            />
          </Can>
          <Can permissions={['department:read', 'department:read_own']}>
            <MetricCard
              title={statLabel(user?.role, user?.departmentId, 'departments')}
              value={stats?.departments ?? 0}
              icon={SquaresFour} color="teal"
              trend={stats?.trends?.departments || { value: 0, positive: true }}
              sparkData={stats?.sparklines?.departments || [0, 0, 0, 0, 0, 0]}
              gradientId="sg-teal" delay={40}
            />
          </Can>
          <Can permissions={['user:read', 'mentor:read']}>
            <MetricCard
              title={statLabel(user?.role, user?.departmentId, 'users')}
              value={stats?.users ?? 0}
              icon={Users} color="slate"
              trend={stats?.trends?.users || { value: 0, positive: true }}
              sparkData={stats?.sparklines?.users?.length ? stats.sparklines.users : [0, 0, 0, 0, 0, 0]}
              gradientId="sg-slate" delay={80}
            />
          </Can>
          <Can permission="student:read">
            <MetricCard
              title={user?.role === 'MENTOR' ? 'Your Students' : isDeptScoped(user?.role, user?.departmentId) ? 'Dept Students' : 'Students'}
              value={stats?.students ?? 0}
              icon={GraduationCap} color="amber"
              trend={stats?.trends?.students || { value: 0, positive: true }}
              sparkData={stats?.sparklines?.students?.length ? stats.sparklines.students : [0, 0, 0, 0, 0, 0]}
              gradientId="sg-amber" delay={120}
            />
          </Can>
        </section>

        {/* ═══ CHART + ACTIVITY ═══ */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Chart */}
          <div className="lg:col-span-3 neo-card animate-slide-up" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Performance
                </h3>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Tests vs Student Activity</p>
              </div>
              <div className="flex gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#8b6bc5]" /> Tests</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> Students</span>
              </div>
            </div>
            <AreaChart data={chartData} />
          </div>

          {/* Activity */}
          <div className="lg:col-span-2 neo-card animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Recent Activity
              </h3>
              <div className="flex items-center gap-1.5">
                <Pulse className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">Live</span>
              </div>
            </div>
            <div className="space-y-1">
              {activityItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 px-2.5 py-2 rounded-md hover:bg-secondary transition-colors cursor-pointer">
                  <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", item.bg)}>
                    <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.sub}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ BOTTOM ROW ═══ */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">

          {/* Leaderboard */}
          <div className="neo-card animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Top Performers
              </h3>
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <div className="space-y-0.5">
              {leaderboard.map((s, idx) => (
                <div key={idx} className="flex items-center gap-3 px-2.5 py-2 rounded-md hover:bg-secondary transition-colors cursor-pointer">
                  <span className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0",
                    idx === 0 ? "bg-amber-500/12 text-amber-400" :
                      idx === 1 ? "bg-slate-400/12 text-slate-300" :
                        idx === 2 ? "bg-orange-400/12 text-orange-300" :
                          "bg-secondary text-muted-foreground"
                  )}>{s.badge || s.rank}</span>
                  <p className="flex-1 text-[13px] font-medium text-foreground truncate">{s.name}</p>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-foreground">{s.score}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div className="neo-card animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Goal Tracking
              </h3>
              <Target className="h-4 w-4 text-[#8b6bc5]" />
            </div>
            <div className="flex items-center justify-around py-2">
              <ProgressRing value={stats?.goals?.passRate ?? 0} color="#8b6bc5" label="Pass Rate" />
              <ProgressRing value={stats?.goals?.attendance ?? 0} color="#60a5fa" label="Attendance" />
              <ProgressRing value={stats?.goals?.completion ?? 0} color="#34d399" label="Completion" />
            </div>
            <div className="h-px w-full bg-border mt-4 mb-3" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Fire className="h-3.5 w-3.5 text-[#8b6bc5]" />
                <span className="text-[11px] text-muted-foreground">{(stats?.goals?.streak ?? 0)}-day streak</span>
              </div>
            </div>
          </div>

          {/* Vitals */}
          <div className="neo-card animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                System Vitals
              </h3>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
              </span>
            </div>
            <div className="space-y-4">
              {[
                { icon: ClipboardText, label: 'Active Tests', value: stats?.vitals?.activeTests ?? 0, color: '#8b6bc5', max: 20 },
                { icon: Briefcase, label: 'Placements', value: stats?.vitals?.placements ?? 0, color: '#60a5fa', max: 50 },
                { icon: BookOpen, label: 'Courses', value: stats?.vitals?.courses ?? 0, color: '#34d399', max: 20 },
                { icon: TrendUp, label: 'Avg Score', value: stats?.vitals?.avgScore ?? 0, color: '#fbbf24', max: 100 },
              ].map((item, idx) => (
                <div key={idx} className="cursor-pointer group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[13px] text-foreground">{item.label}</span>
                    </div>
                    <span className="text-[13px] font-semibold text-foreground">
                      {item.label === 'Avg Score' ? `${item.value}%` : item.value}
                    </span>
                  </div>
                  <div className="bg-border/50 h-1 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min((item.value / item.max) * 100, 100)}%`,
                        backgroundColor: item.color,
                        animation: `widthGrow 0.8s ease-out ${idx * 60 + 200}ms both`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
