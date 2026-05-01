import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in Zenvix Runtime:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-8 animate-in fade-in duration-700 bg-slate-50 dark:bg-slate-950 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl m-8">
            <div className="relative">
              <div className="h-24 w-24 bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center animate-pulse">
                <ShieldAlert className="h-12 w-12 text-rose-600" />
              </div>
              <div className="absolute -top-2 -right-2 h-8 w-8 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-800">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
            </div>

            <div className="text-center space-y-3 max-w-md">
              <h2 className="text-3xl font-black tracking-tighter uppercase italic text-slate-900 dark:text-white leading-none">
                Runtime Exception
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed italic">
                A critical logic branch has failed in the current module.
              </p>
              <div className="mt-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
                <p className="text-[10px] font-mono text-rose-500 truncate">
                  {this.state.error?.message || "Unknown internal error"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={this.handleReset}
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-8 h-12 shadow-xl shadow-indigo-500/20 gap-2 transition-all active:scale-95"
              >
                <RefreshCcw className="h-4 w-4" /> Reset Environment
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/core/dashboard")}
                className="rounded-2xl border-slate-200 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest px-8 h-12 transition-all active:scale-95"
              >
                Return to Command
              </Button>
            </div>

            <div className="pt-4 flex items-center gap-2">
               <div className="h-1 w-1 rounded-full bg-rose-500" />
               <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Diagnostic Data captured for Audit</span>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
