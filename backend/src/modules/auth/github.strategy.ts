import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { prisma } from '../../config/database.js'; // Adjust based on actual config
import { env } from '../../config/env.js';

export const configureGitHubStrategy = () => {
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        console.warn('GitHub OAuth credentials missing. GitHub login will not work.');
        return;
    }

    passport.use(
        new GitHubStrategy(
            {
                clientID: env.GITHUB_CLIENT_ID,
                clientSecret: env.GITHUB_CLIENT_SECRET,
                callbackURL: `${env.BACKEND_URL}/api/auth/github/callback`,
                scope: ['user:email', 'repo', 'read:org'],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Find or create user
                    let user = await prisma.user.findUnique({
                        where: { github_id: profile.id },
                    });

                    if (!user) {
                        // Attempt to link by email if user exists but not linked
                        const email = profile.emails?.[0]?.value;
                        if (email) {
                            user = await prisma.user.findUnique({ where: { email } });
                            if (user) {
                                user = await prisma.user.update({
                                    where: { id: user.id },
                                    data: {
                                        github_id: profile.id,
                                        github_username: profile.username,
                                    },
                                });
                            }
                        }
                    }

                    // If still no user, we might need a registration flow or auto-create
                    // For now, let's assume we return the user and handle tokens
                    return done(null, { ...user, github_accessToken: accessToken });
                } catch (error) {
                    return done(error);
                }
            }
        )
    );
};
