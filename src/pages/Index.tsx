import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/shared/GlassCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/contexts/AppContext';
import { toast } from '@/hooks/use-toast';
import { 
  Building2, 
  ShoppingBag, 
  Coffee, 
  Eye, 
  EyeOff,
  Layers,
  Shield,
  Zap
} from 'lucide-react';

// Mock user database - demonstrates tiered access
const mockUsers = {
  // Core Admin users
  'admin@opscore.com': { password: 'admin123', role: 'admin', name: 'System Admin', app: 'core' as const },
  'manager@opscore.com': { password: 'manager123', role: 'manager', name: 'Branch Manager', app: 'core' as const },
  
  // POS Retail users
  'retail@opscore.com': { password: 'retail123', role: 'cashier', name: 'Retail Cashier', app: 'pos-retail' as const },
  'retail.manager@opscore.com': { password: 'retail123', role: 'manager', name: 'Retail Manager', app: 'pos-retail' as const },
  
  // POS Cafe users
  'cafe@opscore.com': { password: 'cafe123', role: 'cashier', name: 'Cafe Staff', app: 'pos-cafe' as const },
  'cafe.manager@opscore.com': { password: 'cafe123', role: 'manager', name: 'Cafe Manager', app: 'pos-cafe' as const },
};

export default function Index() {
  const navigate = useNavigate();
  const { login, switchApp } = useApp();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const user = mockUsers[loginEmail.toLowerCase() as keyof typeof mockUsers];
    
    if (user && user.password === loginPassword) {
      login({ id: loginEmail, name: user.name, role: user.role });
      switchApp(user.app);
      
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${user.name}`,
      });

      // Route based on user's assigned app
      if (user.app === 'core') {
        navigate('/core');
      } else if (user.app === 'pos-retail') {
        navigate('/pos-retail');
      } else if (user.app === 'pos-cafe') {
        navigate('/pos-cafe');
      }
    } else {
      toast({
        title: 'Login failed',
        description: 'Invalid email or password',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerPassword !== registerConfirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    toast({
      title: 'Registration successful',
      description: 'Please contact your administrator for access.',
    });

    setActiveTab('login');
    setIsLoading(false);
  };

  const demoAccounts = [
    { email: 'admin@opscore.com', password: 'admin123', label: 'Core Admin', icon: Building2, color: 'bg-primary' },
    { email: 'retail@opscore.com', password: 'retail123', label: 'POS Retail', icon: ShoppingBag, color: 'bg-warning' },
    { email: 'cafe@opscore.com', password: 'cafe123', label: 'POS Cafe', icon: Coffee, color: 'bg-warning' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col">
      {/* Header */}
      <header className="py-6 px-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Layers className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">OpsCore</h1>
            <p className="text-xs text-muted-foreground">Business Operations Platform</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-foreground leading-tight">
                Unified Operations
                <br />
                <span className="text-primary">Management System</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                A comprehensive platform for managing your business operations, 
                point-of-sale systems, and enterprise modules in one place.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Core System</h3>
                  <p className="text-sm text-muted-foreground">Admin & management dashboard</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
                <div className="p-2 rounded-lg bg-warning/10">
                  <ShoppingBag className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold">POS Retail</h3>
                  <p className="text-sm text-muted-foreground">Retail point of sale</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Coffee className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold">POS Cafe</h3>
                  <p className="text-sm text-muted-foreground">Restaurant management</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
                <div className="p-2 rounded-lg bg-success/10">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold">Enterprise Modules</h3>
                  <p className="text-sm text-muted-foreground">Finance, HR, Security & more</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Forms */}
          <div className="w-full max-w-md mx-auto">
            <GlassCard className="border-2">
              <GlassCardHeader className="text-center pb-2">
                <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Layers className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold">OpsCore</span>
                </div>
                <GlassCardTitle className="text-2xl">Welcome</GlassCardTitle>
                <GlassCardDescription>
                  Sign in to access your dashboard
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register')}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </form>

                    {/* Demo Accounts */}
                    <div className="pt-4 border-t">
                      <p className="text-sm text-center text-muted-foreground mb-3">
                        Quick access (Demo accounts)
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {(Array.isArray(demoAccounts) ? demoAccounts : []).map((account) => (
                          <Button
                            key={account.email}
                            variant="outline"
                            size="sm"
                            className="flex flex-col h-auto py-3 gap-1"
                            onClick={() => {
                              setLoginEmail(account.email);
                              setLoginPassword(account.password);
                            }}
                          >
                            <account.icon className="h-4 w-4" />
                            <span className="text-xs">{account.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-4">
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter your name"
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-email">Email</Label>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="Enter your email"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-password">Password</Label>
                        <Input
                          id="reg-password"
                          type="password"
                          placeholder="Create a password"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm your password"
                          value={registerConfirmPassword}
                          onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Creating account...' : 'Create Account'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </GlassCardContent>
            </GlassCard>

            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-8 border-t bg-card">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2024 OpsCore. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            <span>Enterprise Business Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
