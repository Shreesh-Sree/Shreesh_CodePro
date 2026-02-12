import { useState, useEffect, useRef } from 'react';
import {
  Buildings, SquaresFour, Users, GraduationCap,
  TrendUp, UserPlus, FileText,
  ClipboardText, Medal, Target,
  ArrowUpRight, ArrowDownRight,
  BookOpen, Briefcase,
  Trophy, Fire,
  Pulse, Shield,
  ArrowRight,
  CheckCircle,
  Clock
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { Can } from '@/contexts/PermissionContext';
import { statsApi, type ApiStats } from '@/lib/api';
import { cn } from '@/lib/utils';
import { BentoGrid, BentoGridItem } from '@/components/shared/BentoGrid';

/* ═══════════════════════════════════════════════
 * Bento-Infused Dashboard
 * High-end animations, glassmorphism,
 * and structured Bento layouts.
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
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={color} />
    </svg>
  );
}

// ── Progress Ring (clean, no outer glow) ──
function ProgressRing({ value, size = 64, strokeWidth = 4, color = '#8b6bc5', label }: {
  value: number; size?: number; strokeWidth?: number; color?: string; label: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--primary)/0.05)" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{value}%</span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</span>
    </div>
  );
}

// ── Area Chart ──
function AreaChart({ data, height = 180 }: {
  data: { label: string; v1: number; v2: number }[];
  height?: number;
}) {
  const w = 600, h = height, pad = 28;
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
  const pts2 = toPoints('v2');
  const line1 = smoothPath(pts1);
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
          stroke="hsl(var(--primary)/0.1)" strokeWidth="0.5" />
      ))}
      <path d={area1} fill="url(#chartFill)" />
      <path d={line1} fill="none" stroke="#8b6bc5" strokeWidth="1.5" strokeLinecap="round" />
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
      <div className="relative z-[1] p-6 lg:p-8 space-y-8 max-w-[1580px] mx-auto">

        {/* ═══ HERO ═══ */}
        <section className="animate-fade-in flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
              {greeting}, {user?.name || 'there'}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" weight="fill" />
              Welcome to your secure Education Command Center
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-3">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-white">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </section>

        {/* ═══ BENTO METRIC ROW 1 & 2 ═══ */}
        <BentoGrid>
          <Can permission="college:read">
            <BentoGridItem
              size="medium"
              title={statLabel(user?.role, user?.departmentId, 'colleges')}
              description="Managed campuses and learning centers"
              icon={<Buildings size={24} weight="fill" />}
              header={
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-white tracking-tighter">
                    <AnimatedNumber value={stats?.colleges ?? 0} />
                  </span>
                  <div className="h-10 w-24">
                    <Sparkline data={stats?.sparklines?.colleges || [0, 0, 0, 0, 0, 0]} color="#8b6bc5" gradientId="bg-c" />
                  </div>
                </div>
              }
            />
          </Can>
          <Can permissions={['department:read', 'department:read_own']}>
            <BentoGridItem
              size="medium"
              title={statLabel(user?.role, user?.departmentId, 'departments')}
              description="Academic units and research wings"
              icon={<SquaresFour size={24} weight="fill" />}
              header={
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-white tracking-tighter">
                    <AnimatedNumber value={stats?.departments ?? 0} />
                  </span>
                  <div className="h-10 w-24">
                    <Sparkline data={stats?.sparklines?.departments || [0, 0, 0, 0, 0, 0]} color="#2dd4bf" gradientId="bg-d" />
                  </div>
                </div>
              }
            />
          </Can>
          <Can permissions={['user:read', 'mentor:read']}>
            <BentoGridItem
              size="medium"
              title={statLabel(user?.role, user?.departmentId, 'users')}
              description="System users and administrators"
              icon={<Users size={24} weight="fill" />}
              header={
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-white tracking-tighter">
                    <AnimatedNumber value={stats?.users ?? 0} />
                  </span>
                  <div className="h-10 w-24">
                    <Sparkline data={stats?.sparklines?.users || [0, 0, 0, 0, 0, 0]} color="#94a3b8" gradientId="bg-u" />
                  </div>
                </div>
              }
            />
          </Can>
          <Can permission="student:read">
            <BentoGridItem
              size="medium"
              title="Enrolled Students"
              description="Active learners in current cycle"
              icon={<GraduationCap size={24} weight="fill" />}
              header={
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-white tracking-tighter">
                    <AnimatedNumber value={stats?.students ?? 0} />
                  </span>
                  <div className="h-10 w-24">
                    <Sparkline data={stats?.sparklines?.students || [0, 0, 0, 0, 0, 0]} color="#fbbf24" gradientId="bg-s" />
                  </div>
                </div>
              }
            />
          </Can>
        </BentoGrid>

        {/* ═══ CHART + ACTIVITY ROW ═══ */}
        <BentoGrid>
          <BentoGridItem
            size="large"
            title="Performance Curve"
            description="Institutional growth and testing trends"
            icon={<TrendUp size={24} weight="fill" />}
            header={
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Tests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Projected</span>
                  </div>
                </div>
                <div className="relative h-[200px] w-full mt-4">
                  {chartData.length > 0 ? (
                    <AreaChart data={chartData} height={300} />
                  ) : (
                    <div className="flex h-[300px] w-full items-center justify-center text-muted-foreground">
                      No activity data available
                    </div>
                  )}
                </div>
              </div>
            }
          />

          <BentoGridItem
            size="small"
            title="Global Activity"
            description="Live system event stream"
            icon={<Pulse size={24} className="animate-pulse text-emerald-500" weight="fill" />}
            header={
              <div className="space-y-3 mt-2">
                {activityItems.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all cursor-pointer group/item">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg", item.bg)}>
                      <item.icon className={cn("h-5 w-5", item.color)} weight="fill" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground/60">{item.time}</span>
                  </div>
                ))}
              </div>
            }
          />
        </BentoGrid>

        {/* ═══ BOTTOM BENTO ROW ═══ */}
        <BentoGrid>
          <BentoGridItem
            title="Top Achievers"
            description="Leading performers in current tests"
            icon={<Trophy size={20} className="text-amber-400" weight="fill" />}
            size="small"
            className="md:col-span-2"
            header={
              <div className="space-y-3">
                {leaderboard.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-black/20">
                    <div className="flex items-center gap-3">
                      <span className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                        i === 0 ? "bg-amber-400 text-black" : i === 1 ? "bg-slate-300 text-black" : "bg-orange-400 text-black")}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-bold text-white">{s.name}</span>
                    </div>
                    <span className="text-sm font-black text-primary">{s.score}</span>
                  </div>
                ))}
              </div>
            }
          />

          <BentoGridItem
            title="Goal Progress"
            description="Institutional KPI targets"
            icon={<Target size={20} className="text-primary" weight="fill" />}
            size="small"
            className="md:col-span-2"
            header={
              <div className="flex items-center justify-between pt-2">
                <ProgressRing value={stats?.goals?.passRate ?? 0} color="#8b6bc5" label="Pass" />
                <ProgressRing value={stats?.goals?.attendance ?? 0} color="#60a5fa" label="Attend" />
              </div>
            }
          />

          <BentoGridItem
            title="System Health"
            description="Infrastructure status"
            icon={<Shield size={20} className="text-emerald-400" weight="fill" />}
            size="small"
            className="md:col-span-2"
            header={
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                  <span className="text-xs font-bold text-emerald-500 uppercase">Gateway</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />
                </div>
                <div className="flex items-center justify-between bg-primary/5 p-2 rounded-xl border border-primary/10">
                  <span className="text-xs font-bold text-primary uppercase">Tests Active</span>
                  <span className="text-sm font-black text-primary">{stats?.vitals?.activeTests ?? 0}</span>
                </div>
              </div>
            }
          />
        </BentoGrid>

      </div>
    </div>
  );
}
