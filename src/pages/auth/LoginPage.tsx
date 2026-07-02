import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/useIsMobile";
import { CompanyLogo } from "@/components/CompanyLogo";
import { APP_COPYRIGHT_YEAR } from "@/lib/version";

export function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme, canToggleTheme } = useTheme();
  const { companyName } = useBranding();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      navigate(isMobile ? "/m" : "/web");
    } catch (err: any) {
      setError(err.message || t("auth.login_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-black/20" />
        
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <CompanyLogo
              size="md"
              subtitle="TARA System"
              nameClassName="!text-primary-foreground"
              className="[&_p]:!text-primary-foreground/70"
            />
          </div>

          <div className="space-y-6">
            <h1 className="font-display text-4xl font-semibold text-primary-foreground leading-tight">
              Total Assistance for<br />
              Resources &<br />
              Administration
            </h1>
            <p className="text-primary-foreground/60 text-sm max-w-sm leading-relaxed">
              Sistem manajemen HR otonom untuk {companyName}.
              Otomatisasi cerdas, keamanan tingkat enterprise.
            </p>
          </div>

          <p className="text-primary-foreground/30 text-xs">
            © {APP_COPYRIGHT_YEAR} {companyName}. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 bg-background relative">
        {canToggleTheme && (
          <button
            onClick={toggleTheme}
            className="absolute top-6 right-6 p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          </button>
        )}

        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center">
            <CompanyLogo size="md" subtitle="" />
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-display font-semibold">{t("auth.welcome")}</h2>
            <p className="text-sm text-muted-foreground">{t("auth.sign_in_description")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="px-4 py-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-luxury-label">{t("auth.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                required
                className="w-full h-11 px-4 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-luxury-label">{t("auth.password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 px-4 pr-10 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full h-11 rounded-md bg-primary text-primary-foreground text-sm font-medium",
                "hover:bg-primary/90 transition-all duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              )}
            >
              {isLoading ? t("auth.processing") : t("auth.sign_in")}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            {t("auth.need_help")}
          </p>
        </div>
      </div>
    </div>
  );
}
