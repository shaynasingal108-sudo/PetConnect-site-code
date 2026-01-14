import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Users, Calendar, MapPin, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PostCard } from '@/components/feed/PostCard';
import { format } from 'date-fns';
import { fetchHydratedPosts } from '@/lib/posts';


export default function GroupDetailPage() {
  const { groupId } = useParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [eventData, setEventData] = useState({ title: '', description: '', location: '', date: '' });

  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      return data;
    },
    enabled: !!groupId,
  });

  const { data: membership } = useQuery({
    queryKey: ['group-membership', groupId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('group_memberships')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user?.id)
        .single();
      return data;
    },
    enabled: !!groupId && !!user,
  });

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: ['group-posts', groupId],
    queryFn: () => fetchHydratedPosts({ groupId: groupId as string, limit: 50 }),
    enabled: !!groupId,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });


  const { data: events } = useQuery({
    queryKey: ['group-events', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('group_events')
        .select('*')
        .eq('group_id', groupId)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });
      return data || [];
    },
    enabled: !!groupId,
  });

  const { data: members } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('group_memberships')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'approved');
      return data || [];
    },
    enabled: !!groupId,
  });


  const isOwner = group?.owner_id === user?.id;
  const isMember = membership?.status === 'approved';

  const handlePost = async () => {
    if (!user || !newPost.trim() || !isMember) return;

    setIsPosting(true);
    try {
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newPost.trim(),
        group_id: groupId,
        city: profile?.city,
      });

      if (error) throw error;

      toast({ title: 'Posted!', description: 'Your post is now live in the group.' });
      setNewPost('');
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsPosting(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!user || !isOwner || !eventData.title || !eventData.date) return;

    try {
      const { error } = await supabase.from('group_events').insert({
        group_id: groupId,
        created_by: user.id,
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        event_date: new Date(eventData.date).toISOString(),
      });

      if (error) throw error;

      toast({ title: 'Event Created!', description: 'Members will be notified.' });
      setShowEventDialog(false);
      setEventData({ title: '', description: '', location: '', date: '' });
      queryClient.invalidateQueries({ queryKey: ['group-events', groupId] });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loadingGroup) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Group not found</p>
        <Link to="/groups">
          <Button variant="link">Back to Groups</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/groups">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">{group.name}</h1>
            {group.is_community && <Badge variant="secondary">Community</Badge>}
          </div>
          <p className="text-muted-foreground">{group.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{members?.length || 0} members</span>
        </div>
        {group.city && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{group.city}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {group.tags?.map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      </div>

      {/* Events Board */}
      {events && events.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.map((event: any) => (
              <div key={event.id} className="p-3 bg-background/80 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                    {event.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {event.location}
                      </p>
                    )}
                  </div>
                  <Badge>{format(new Date(event.event_date), 'MMM d, h:mm a')}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Event Button (Owner only) */}
      {isOwner && (
        <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" /> Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Event title"
                value={eventData.title}
                onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
              />
              <Textarea
                placeholder="Description (optional)"
                value={eventData.description}
                onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
              />
              <Input
                placeholder="Location (e.g., Central Park)"
                value={eventData.location}
                onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
              />
              <Input
                type="datetime-local"
                value={eventData.date}
                onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
              />
              <Button onClick={handleCreateEvent} className="w-full gradient-primary">
                Create Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Post Input (Members only) */}
      {isMember ? (
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>{profile?.username?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Share something with the group..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handlePost}
                    disabled={isPosting || !newPost.trim()}
                    className="gradient-primary"
                  >
                    {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="text-center py-6">
          <CardContent>
            <p className="text-muted-foreground">Join this group to post and participate!</p>
          </CardContent>
        </Card>
      )}

      {/* Posts Feed */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Posts</h2>
        {loadingPosts ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : posts?.length === 0 ? (
          <Card className="text-center py-8 text-muted-foreground">
            <CardContent>
              <p>No posts yet. Be the first to share!</p>
            </CardContent>
          </Card>
        ) : (
          posts?.map((post: any) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
