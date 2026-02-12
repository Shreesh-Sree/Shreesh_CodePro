
import express from 'express';
import { getDashboardStats } from '../controllers/stats.controller.ts';
import { authenticate } from '../middlewares/auth.middleware.ts';

const router = express.Router();

// GET /api/stats - Fetch all dashboard data (Counts, Activity, Leaderboard, Vitals)
router.get('/', authenticate, getDashboardStats);

export default router;
