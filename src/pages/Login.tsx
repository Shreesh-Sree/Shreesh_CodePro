import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircleNotch, ArrowRight, EnvelopeSimple, LockKey } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
    <div className="h-screen w-full bg-muted flex items-center justify-center p-0 sm:p-6 lg:p-8 font-sans overflow-hidden">

      {/* Main Floating Window Frame */}
      <div className="w-full h-full sm:max-w-[1800px] sm:max-h-[1080px] bg-background rounded-none sm:rounded-[2.5rem] border-0 sm:border border-border shadow-2xl overflow-hidden flex relative">

        {/* Left Panel: Brand Identity (Visual) */}
        <div className="hidden lg:flex w-1/2 relative bg-muted items-center justify-center p-12 overflow-hidden border-r border-border">
          {/* Gradient Mesh Background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/15 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/8 rounded-full blur-[80px]" />
          </div>

          {/* Giant Centered Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/15 blur-[60px] rounded-full scale-125 transition-all duration-700 group-hover:scale-150 group-hover:blur-[80px]" />
              <img
                src="/logo.png"
                alt="CodePro Logo"
                className="w-[480px] h-[480px] object-contain relative z-10 drop-shadow-2xl"
              />
            </div>
          </motion.div>
        </div>

        {/* Right Panel: Login Interface */}
        <div className="flex-1 w-full flex flex-col items-center justify-center px-5 py-8 sm:p-8 bg-background relative text-foreground">
          {/* Subtle Glow */}
          <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          <div className="w-full max-w-[420px] space-y-8 sm:space-y-12 relative z-10">

            {/* Mobile Logo */}
            <div className="flex lg:hidden justify-center mb-2">
              <img src="/logo.png" alt="CodePro Logo" className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-xl" />
            </div>

            {/* Header */}
            <div className="space-y-3 sm:space-y-4 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-[10px] font-medium tracking-widest uppercase text-muted-foreground mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Secure Access
              </div>
              <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-foreground font-serif italic">
                Welcome back.
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base font-light leading-relaxed">
                Sign in to continue to your workspace.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6 sm:space-y-8">
              <div className="space-y-5 sm:space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Email</Label>
                  <div className="relative group">
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 sm:h-14 bg-card border-border focus:border-primary/50 focus:ring-0 text-foreground placeholder:text-muted-foreground/40 rounded-lg pl-3 transition-all duration-300 font-light text-base sm:text-lg"
                      placeholder="name@codepro.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Password</Label>
                    <a href="#" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors font-serif italic">
                      Forgot Password?
                    </a>
                  </div>
                  <div className="relative group">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 sm:h-14 bg-card border-border focus:border-primary/50 focus:ring-0 text-foreground placeholder:text-muted-foreground/40 rounded-lg pl-3 transition-all duration-300 font-light text-base sm:text-lg text-security-disc"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 sm:h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base sm:text-lg tracking-tight shadow-lg shadow-primary/10 transition-all duration-300 rounded-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                {/* Button Shine Effect */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />

                {isLoading ? (
                  <CircleNotch className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="relative z-10 flex items-center gap-2">
                    Sign In <ArrowRight weight="light" className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="text-center pt-4 sm:pt-8">
              <p className="text-sm text-muted-foreground font-light">
                Don't have an account? <a href="#" className="text-foreground hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-px">Contact Support</a>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
