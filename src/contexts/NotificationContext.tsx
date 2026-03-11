import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { apiUrl } from '@/lib/api-config';
import { toast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'ALERT' | 'CHAT' | 'MAIL' | 'TASK';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface UnreadCounts {
  total: number;
  notifications: number;
  chat: number;
  mail: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCounts: UnreadCounts;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { session, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    total: 0,
    notifications: 0,
    chat: 0,
    mail: 0
  });
  const socketRef = useRef<Socket | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!session?.token) return;
    try {
      const res = await fetch(apiUrl('/comms/notifications'), {
        headers: {
          'x-tenant-id': session.tenantId,
          'Authorization': `Bearer ${session.token}`
        }
      });
      const data = await res.json();
      if (data.data) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error('[NotificationContext] Fetch Fail:', err);
    }
  }, [session]);

  const fetchCounts = useCallback(async () => {
    if (!session?.token) return;
    try {
      const res = await fetch(apiUrl('/comms/notifications/counts'), {
        headers: {
          'x-tenant-id': session.tenantId,
          'Authorization': `Bearer ${session.token}`
        }
      });
      const data = await res.json();
      if (data.total !== undefined) {
        setUnreadCounts(data);
      }
    } catch (err) {
      console.error('[NotificationContext] Counts Fetch Fail:', err);
    }
  }, [session]);

  useEffect(() => {
    if (isAuthenticated && session?.userId) {
      fetchNotifications();
      fetchCounts();

      // Setup Socket
      const socketUrl = window.location.origin;
      const socket = io(`${socketUrl}/notifications`, {
        path: "/socket.io",
        query: {
          tenantId: session.tenantId,
          userId: session.userId
        }
      });

      socket.on('connect', () => console.log('[NotificationSocket] Connected'));
      
      socket.on('sync_counts', (counts: UnreadCounts) => {
        setUnreadCounts(counts);
      });

      socket.on('new_notification', (notif: Notification) => {
        setNotifications(prev => [notif, ...prev]);
        toast({
          title: notif.title,
          description: notif.message,
        });
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    }
  }, [isAuthenticated, session?.userId, session?.tenantId, fetchNotifications, fetchCounts]);

  const markAsRead = async (id: string | null) => {
    if (!session?.token || !id) return;
    try {
      const res = await fetch(apiUrl(`/comms/notifications/${id}/read`), {
        method: 'PATCH',
        headers: {
          'x-tenant-id': session.tenantId,
          'Authorization': `Bearer ${session.token}`
        }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        // We'll trust the next sync_counts for the actual number, but we can optimistically update
        setUnreadCounts(prev => ({
            ...prev,
            notifications: Math.max(0, prev.notifications - 1),
            total: Math.max(0, prev.total - 1)
        }));
      }
    } catch (err) {
      console.error('[NotificationContext] Mark Read Fail:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!session?.token) return;
    try {
      const res = await fetch(apiUrl('/comms/notifications/read-all'), {
        method: 'POST',
        headers: {
          'x-tenant-id': session.tenantId,
          'Authorization': `Bearer ${session.token}`
        }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCounts(prev => ({
            ...prev,
            notifications: 0,
            total: prev.chat + prev.mail
        }));
      }
    } catch (err) {
        console.error('[NotificationContext] Mark All Read Fail:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
        notifications, 
        unreadCounts, 
        markAsRead, 
        markAllAsRead, 
        fetchNotifications,
        fetchCounts
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
