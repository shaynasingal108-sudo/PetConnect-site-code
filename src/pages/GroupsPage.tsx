import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function GroupsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data } = await supabase
        .from('groups')
        .select('*, group_memberships(count)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: myMemberships, refetch: refetchMemberships } = useQuery({
    queryKey: ['my-memberships', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('group_memberships')
        .select('group_id, status')
        .eq('user_id', user?.id);
      return data || [];
    },
    enabled: !!user,
  });

  const handleJoin = async (groupId: string, requiresApproval: boolean) => {
    if (!user) return;

    const { error } = await supabase.from('group_memberships').insert({
      group_id: groupId,
      user_id: user.id,
      status: requiresApproval ? 'pending' : 'approved',
      role: 'member',
    });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already requested!', description: 'You have already requested to join this group.' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ 
        title: requiresApproval ? 'Request Sent!' : 'Joined!', 
        description: requiresApproval ? 'Waiting for approval' : 'Welcome to the group!' 
      });
      // Refetch memberships to update UI
      refetchMemberships();
      queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
    }
  };

  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      // First delete all memberships for this group
      await supabase.from('group_memberships').delete().eq('group_id', groupId);
      // Then delete the group
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Group deleted!' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getMembershipStatus = (groupId: string) => {
    return myMemberships?.find((m) => m.group_id === groupId)?.status;
  };

  const filteredGroups = groups?.filter((g: any) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.tags?.some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  );

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
          <Users className="h-6 w-6" /> Groups & Communities
        </h1>
        <p className="text-muted-foreground">Find and join pet communities</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search groups by name or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4">
        {filteredGroups?.length === 0 ? (
          <Card className="text-center py-8 text-muted-foreground">
            <CardContent>
              <p>No groups found. Create one!</p>
            </CardContent>
          </Card>
        ) : (
          filteredGroups?.map((group: any) => {
            const status = getMembershipStatus(group.id);
            const canViewGroup = status === 'approved' || !group.requires_approval;
            
            return (
              <Card 
                key={group.id} 
                className={`${canViewGroup ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                onClick={() => canViewGroup && navigate(`/groups/${group.id}`)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{group.name}</h3>
                        {group.is_community && <Badge variant="secondary">Community</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{group.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {group.tags?.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                      {group.city && (
                        <p className="text-xs text-muted-foreground mt-2">📍 {group.city}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {status === 'approved' ? (
                        <Badge className="bg-green-500">Joined</Badge>
                      ) : status === 'pending' ? (
                        <Badge variant="secondary">Pending</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoin(group.id, group.requires_approval);
                          }}
                          className="gradient-primary"
                        >
                          {group.requires_approval ? 'Request' : 'Join'}
                        </Button>
                      )}
                      {group.owner_id === user?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Group</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{group.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteGroup.mutate(group.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
