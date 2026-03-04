/**
 * NotificationBell Component
 * Displays notification icon with unread count badge and dropdown
 */

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(
    undefined,
    { enabled: !!user, refetchInterval: 30000 }
  );
  
  const { data: notifications = [], refetch } = trpc.notifications.list.useQuery(
    { limit: 10 },
    { enabled: !!user && isOpen }
  );
  
  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
  });
  
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => refetch(),
  });
  
  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => refetch(),
  });
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  if (!user) return null;
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'contribution_accepted':
        return <span className="text-green-500">✓</span>;
      case 'contribution_rejected':
        return <span className="text-red-500">✗</span>;
      case 'campaign_milestone':
        return <span className="text-amber-500">★</span>;
      case 'new_contribution':
        return <span className="text-blue-500">+</span>;
      default:
        return <span className="text-gray-500">•</span>;
    }
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-[#1a472a]/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-[#1a472a]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#7dd87d]/30 z-50 max-h-[70vh] overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-[#7dd87d]/20">
            <h3 className="font-bold text-[#1a472a]">Notifications</h3>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-[#4a7c59] hover:text-[#1a472a]"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-[#1a472a]/60">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-[#7dd87d]/10 hover:bg-[#f0f7f0] transition-colors ${
                    !notification.read ? 'bg-[#f0f7f0]/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm ${!notification.read ? 'font-semibold' : ''} text-[#1a472a]`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.read && (
                            <button
                              onClick={() => markReadMutation.mutate({ id: notification.id })}
                              className="p-1 hover:bg-[#7dd87d]/20 rounded"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3 text-[#4a7c59]" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteMutation.mutate({ id: notification.id })}
                            className="p-1 hover:bg-red-100 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-[#1a472a]/70 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-[#1a472a]/40 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-2 border-t border-[#7dd87d]/20 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-[#4a7c59] hover:underline"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
