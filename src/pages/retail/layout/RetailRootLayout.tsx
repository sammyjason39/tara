import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { RetailProvider, useRetail } from '../context/RetailContext';
import { RetailManagementShell } from './RetailManagementShell';
import { RetailOperationalShell } from './RetailOperationalShell';
import { RetailGlobalAdminBar } from '../components/RetailGlobalAdminBar';
import { useSession } from '@/core/security/session';
import { Roles } from '@/core/security/roles';

const RootLayoutContent = () => {
  const { mode, setMode, isLoading } = useRetail();
  const location = useLocation();
  const session = useSession();
  const isEligibleForGlobalBar = [Roles.SUPERADMIN, Roles.OWNER].includes(session.role as any);

  useEffect(() => {
    // Path-based mode detection (Enforcement)
    if (location.pathname.includes('/operational/')) {
      if (mode !== 'operational') setMode('operational');
    } else {
      // workspace and /management/ routes default to management plane
      if (mode !== 'management') setMode('management');
    }
  }, [location.pathname, mode, setMode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
             <div className="h-full bg-blue-600 animate-[loading_1.5s_infinite]" />
          </div>
          <div className="animate-pulse text-blue-600 font-black italic tracking-tighter text-sm">
            NEXUS_RETAIL_AUTHORITY_SYNCING...
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased">
      {isEligibleForGlobalBar && mode !== 'operational' && <RetailGlobalAdminBar />}
      
      {mode === 'operational' ? (
        <RetailOperationalShell>
          <Outlet />
        </RetailOperationalShell>
      ) : (
        <RetailManagementShell>
          <Outlet />
        </RetailManagementShell>
      ) }
    </div>
  );
};

export const RetailRootLayout = () => (
  <RetailProvider>
    <RootLayoutContent />
  </RetailProvider>
);
