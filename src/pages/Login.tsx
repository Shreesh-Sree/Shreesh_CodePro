import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Buildings, CircleNotch } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      toast.error('Please enter email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 flex items-center justify-center mb-2">
              <img src="/logo.png" alt="CodePro Logo" className="h-14 w-14 object-contain drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">CodePro</h1>
              <p className="text-sm text-muted-foreground">Education Management System</p>
            </div>
          </div>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription>Sign in with your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 relative z-50"
                autoComplete="email"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 relative z-50"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="button"
              className="w-full h-11"
              onClick={handleLogin}
              disabled={!email.trim() || !password || isLoading}
            >
              {isLoading ? (
                <>
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
