import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserPlus, Check, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { fetchFriendRows, fetchProfilesMapByUserIds, getOtherUserId } from '@/lib/social';

export default function FriendsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Ensure demo social data exists for new users.
  const seedQuery = useQuery({
    queryKey: ['seed-demo-social', user?.id],
    queryFn: async () => {
      await supabase.functions.invoke('seed-demo-social');
      return true;
    },
    enabled: !!user,
    staleTime: Infinity,
    retry: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['friends-page', user?.id],
    queryFn: async () => {
      const userId = user!.id;
      const friendRows = await fetchFriendRows(userId);
      const otherUserIds = friendRows.map((r) => getOtherUserId(r, userId));
      const profilesMap = await fetchProfilesMapByUserIds(otherUserIds);

      const rowsWithProfile = friendRows.map((r) => ({
        ...r,
        otherUserId: getOtherUserId(r, userId),
        otherProfile: profilesMap[getOtherUserId(r, userId)] || null,
      }));

      return rowsWithProfile;
    },
    enabled: !!user && !seedQuery.isLoading,
  });

  const respondToRequest = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('friends').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends-page'] });
      toast({ title: 'Updated!' });
    },
  });

  const friends = data || [];
  const acceptedFriends = friends.filter((f: any) => f.status === 'accepted');
  const pendingReceived = friends.filter((f: any) => f.status === 'pending' && f.friend_id === user?.id);
  const pendingSent = friends.filter((f: any) => f.status === 'pending' && f.user_id === user?.id);

  if (seedQuery.isLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center py-4">
        <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
          <UserPlus className="h-6 w-6" /> Friends
        </h1>
        <p className="text-muted-foreground">Connect with other pet owners</p>
      </div>

      <Tabs defaultValue="friends">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends">Friends ({acceptedFriends.length})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({pendingReceived.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({pendingSent.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4 mt-4">
          {acceptedFriends.length === 0 ? (
            <Card className="text-center py-8 text-muted-foreground">
              <p>No friends yet. Start connecting!</p>
            </Card>
          ) : (
            acceptedFriends.map((f: any) => (
              <Card key={f.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={f.otherProfile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(f.otherProfile?.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{f.otherProfile?.username || 'User'}</p>
                        <p className="text-sm text-muted-foreground">{f.otherProfile?.city}</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => navigate('/messages', { state: { selectedUserId: f.otherUserId } })}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4 mt-4">
          {pendingReceived.length === 0 ? (
            <Card className="text-center py-8 text-muted-foreground">
              <p>No pending requests</p>
            </Card>
          ) : (
            pendingReceived.map((f: any) => (
              <Card key={f.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={f.otherProfile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(f.otherProfile?.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-semibold">{f.otherProfile?.username || 'User'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => respondToRequest.mutate({ id: f.id, status: 'accepted' })}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => respondToRequest.mutate({ id: f.id, status: 'rejected' })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4 mt-4">
          {pendingSent.length === 0 ? (
            <Card className="text-center py-8 text-muted-foreground">
              <p>No pending sent requests</p>
            </Card>
          ) : (
            pendingSent.map((f: any) => (
              <Card key={f.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={f.otherProfile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {(f.otherProfile?.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{f.otherProfile?.username || 'User'}</p>
                      <p className="text-xs text-muted-foreground">Pending approval</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
