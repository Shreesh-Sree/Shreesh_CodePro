import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key'; // TODO: Move to .env

const prisma = new PrismaClient();

app.use(cors({
    origin: 'http://localhost:5173', // Frontend URL
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

import statsRoutes from './routes/stats.routes.ts';

// --- Auth Routes ---
app.use('/api/stats', statsRoutes);

// Login
app.post('/api/auth/login', async (req, res): Promise<any> => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { role: true }, // Include role for permissions
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password || '');

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role?.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'lax', // Needed for localhost dev
        });

        // Return User (exclude password)
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ user: { ...userWithoutPassword, permissions: [] } }); // permissions are usually fetched separately or embedded in role

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Me (Get Current User)
app.get('/api/auth/me', async (req, res): Promise<any> => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true },
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const { password: _, ...userWithoutPassword } = user;
        return res.json({ user: { ...userWithoutPassword, permissions: [] } });

    } catch (error) {
        console.error('Auth check error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

app.get('/', (req, res) => {
    res.send('Backend is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
