import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'friend': return '👋';
      case 'group': return '👥';
      case 'event': return '📅';
      default: return '🔔';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" /> Notifications
          </h1>
          <p className="text-muted-foreground">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
            <Check className="h-4 w-4 mr-2" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications?.length === 0 ? (
          <Card className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications yet</p>
          </Card>
        ) : (
          notifications?.map((notif: any) => (
            <Card
              key={notif.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                !notif.read ? 'border-primary/50 bg-primary/5' : ''
              }`}
              onClick={() => !notif.read && markAsRead.mutate(notif.id)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getIcon(notif.type)}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{notif.title}</p>
                    {notif.content && <p className="text-sm text-muted-foreground">{notif.content}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(notif.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  {!notif.read && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
