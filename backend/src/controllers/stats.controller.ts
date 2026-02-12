
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middlewares/auth.middleware.ts';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;

        // 1. Basic Counts
        const colleges = await prisma.college.count();
        const departments = await prisma.department.count();
        const users = await prisma.user.count();
        const students = await prisma.user.count({
            where: { role: { role: 'STUDENT' } }
        });

        // 2. Recent Activity (Action Logs)
        const recentActivity = await prisma.actionLog.findMany({
            take: 5,
            orderBy: { created_at: 'desc' },
            include: {
                user: { select: { name: true, role: { select: { role: true } } } }
            }
        });

        const activityItems = recentActivity.map(log => ({
            label: log.action || 'Unknown Action',
            sub: `${log.user?.name || 'System'} (${log.user?.role?.role || 'User'})`,
            time: log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            timestamp: log.created_at,
            type: log.target_type || 'info',
        }));

        // 3. Leaderboard (Top 5 Students by Score/Coins)
        const topStudents = await prisma.user.findMany({
            where: { role: { role: 'STUDENT' } },
            take: 5,
            orderBy: [
                { coins: 'desc' },
                { streak: 'desc' }
            ],
            select: {
                id: true,
                name: true,
                coins: true,
                student_profile: { select: { batch: { select: { batch_year: true } } } }
            }
        });

        const leaderboard = topStudents.map((s, idx) => ({
            rank: idx + 1,
            name: s.name || 'Student',
            score: s.coins,
            badge: idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '',
            change: '0'
        }));

        // 4. Chart Data (Tests)
        const chartDataRaw = await prisma.$queryRaw`
      SELECT TO_CHAR(start_time, 'Mon') as label, COUNT(*)::int as v1
      FROM test_attempts
      WHERE start_time >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(start_time, 'Mon'), EXTRACT(MONTH FROM start_time)
      ORDER BY EXTRACT(MONTH FROM start_time)
    `;
        const chartData = (chartDataRaw as any[]).map((d: any) => ({
            label: d.label,
            v1: Number(d.v1),
            v2: Math.round(Number(d.v1) * 0.8)
        }));

        // 5. Sparklines & Trends (New)
        // Helper to process history
        const getSparkline = async (table: string, roleFilter?: boolean) => {
            let query;
            if (roleFilter) {
                query = prisma.$queryRaw`
          SELECT TO_CHAR(u.created_at, 'YYYY-MM') as month, COUNT(*)::int as count 
          FROM users u 
          JOIN roles r ON u.role_id = r.id 
          WHERE r.role = 'STUDENT' AND u.created_at >= NOW() - INTERVAL '6 months'
          GROUP BY 1 ORDER BY 1 ASC
        `;
            } else {
                // Use table name safely? Prisma raw query doesn't support dynamic table names easily for safety.
                // We only use 'users' here.
                query = prisma.$queryRaw`
          SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*)::int as count 
          FROM users 
          WHERE created_at >= NOW() - INTERVAL '6 months'
          GROUP BY 1 ORDER BY 1 ASC
        `;
            }
            const data = (await query as any[]).map(d => Number(d.count));
            // Pad if empty
            if (data.length < 2) return { spark: [...Array(6 - data.length).fill(0), ...data], trend: { value: 0, positive: true } };

            const last = data[data.length - 1] ?? 0;
            const prev = data[data.length - 2] ?? 0;
            const trendVal = prev === 0 ? 100 : Math.round(((last - prev) / prev) * 100);
            return { spark: data, trend: { value: trendVal, positive: trendVal >= 0 } };
        };

        // Users
        const usersData = await getSparkline('users');
        // Students
        const studentsData = await getSparkline('users', true);

        // Colleges/Departments (Static / Mock)
        const staticSpark = [0, 0, 0, 0, 0, 0];
        const staticTrend = { value: 0, positive: true };

        const sparklines = {
            colleges: staticSpark,
            departments: staticSpark,
            users: usersData.spark,
            students: studentsData.spark
        };

        const trends = {
            colleges: staticTrend,
            departments: staticTrend,
            users: usersData.trend,
            students: studentsData.trend
        };

        // 6. Vitals & Goals
        const activeTests = await prisma.test.count({ where: { status: 'LIVE' } });
        const placements = await prisma.placement.count();
        const courses = await prisma.module.count({ where: { parent_id: null } });
        const avgScoreAgg = await prisma.testAttempt.aggregate({ _avg: { total_marks: true } });
        const avgScore = avgScoreAgg._avg.total_marks ? Math.round(Number(avgScoreAgg._avg.total_marks)) : 0;

        const vitals = { activeTests, placements, courses, avgScore };
        const goals = { passRate: 78, attendance: 92, completion: 65, streak: user?.streak || 0 };

        res.json({
            colleges,
            departments,
            users,
            students,
            sparklines,
            trends,
            activity: activityItems,
            leaderboard,
            chartData,
            vitals,
            goals
        });

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
