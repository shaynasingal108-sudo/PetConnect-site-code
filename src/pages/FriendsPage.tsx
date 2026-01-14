import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserPlus, Check, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function FriendsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: friends, isLoading } = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('friends')
        .select('*, friend:profiles!friends_friend_id_fkey(*), requester:profiles!friends_user_id_fkey(*)')
        .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`);
      return data || [];
    },
    enabled: !!user,
  });

  const respondToRequest = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('friends').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast({ title: 'Updated!' });
    },
  });

  const acceptedFriends = friends?.filter((f: any) => f.status === 'accepted') || [];
  const pendingReceived = friends?.filter((f: any) => f.status === 'pending' && f.friend_id === user?.id) || [];
  const pendingSent = friends?.filter((f: any) => f.status === 'pending' && f.user_id === user?.id) || [];

  const getFriendProfile = (friendship: any) => {
    return friendship.user_id === user?.id ? friendship.friend : friendship.requester;
  };

  if (isLoading) {
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
            acceptedFriends.map((f: any) => {
              const profile = getFriendProfile(f);
              return (
                <Card key={f.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback>{profile?.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{profile?.username}</p>
                          <p className="text-sm text-muted-foreground">{profile?.city}</p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => navigate('/messages')}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
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
                        <AvatarImage src={f.requester?.avatar_url} />
                        <AvatarFallback>{f.requester?.username?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <p className="font-semibold">{f.requester?.username}</p>
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
                      <AvatarImage src={f.friend?.avatar_url} />
                      <AvatarFallback>{f.friend?.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{f.friend?.username}</p>
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
