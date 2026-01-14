import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Bookmark, ThumbsUp, UserPlus, Rocket } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Post } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CommentsSection } from './CommentsSection';
import { SaveToBoard } from './SaveToBoard';
import { BoostPostDialog } from '@/components/business/BoostPostDialog';
import { Link } from 'react-router-dom';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showBoostDialog, setShowBoostDialog] = useState(false);

  const isOwnPost = user?.id === post.user_id;
  const isBusinessAccount = profile?.is_business;

  const isLiked = post.likes?.some(like => like.user_id === user?.id);
  const isHelpful = post.helpful_marks?.some(mark => mark.user_id === user?.id);
  const likesCount = post.likes?.length || 0;
  const commentsCount = post.comments?.length || 0;

  const handleLike = async () => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
      } else {
        await supabase.from('likes').insert({
          user_id: user.id,
          post_id: post.id,
        });
        
        // Award point to post author for getting a like
        if (post.user_id !== user.id) {
          const { data: authorProfile } = await supabase
            .from('profiles')
            .select('points')
            .eq('user_id', post.user_id)
            .single();
          
          if (authorProfile) {
            await supabase
              .from('profiles')
              .update({ points: (authorProfile.points || 0) + 1 })
              .eq('user_id', post.user_id);
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not update like',
        variant: 'destructive',
      });
    }
  };

  const handleHelpful = async () => {
    if (!user) return;

    try {
      if (isHelpful) {
        await supabase
          .from('helpful_marks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
      } else {
        await supabase.from('helpful_marks').insert({
          user_id: user.id,
          post_id: post.id,
        });

        // Award 2 points to post author for getting a helpful mark
        if (post.user_id !== user.id) {
          const { data: authorProfile } = await supabase
            .from('profiles')
            .select('points')
            .eq('user_id', post.user_id)
            .single();
          
          if (authorProfile) {
            await supabase
              .from('profiles')
              .update({ points: (authorProfile.points || 0) + 2 })
              .eq('user_id', post.user_id);
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not mark as helpful',
        variant: 'destructive',
      });
    }
  };

  const handleAddFriend = async () => {
    if (!user || !post.profiles) return;

    try {
      const { error } = await supabase.from('friends').insert({
        user_id: user.id,
        friend_id: post.user_id,
        status: 'pending',
      });

      if (error && error.code === '23505') {
        toast({
          title: 'Already sent',
          description: 'Friend request already sent',
        });
        return;
      }

      if (error) throw error;

      toast({
        title: 'Friend request sent!',
        description: `Request sent to ${post.profiles.username}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="shadow-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3 group">
            <Avatar className="h-10 w-10 border-2 border-primary/10 group-hover:border-primary/30 transition-colors">
              <AvatarImage src={post.profiles?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {post.profiles?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                {post.profiles?.username}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                {post.city && ` · ${post.city}`}
              </p>
            </div>
          </Link>
          {user?.id !== post.user_id && (
            <Button variant="ghost" size="icon" onClick={handleAddFriend}>
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post image"
            className="mt-3 rounded-lg w-full max-h-96 object-cover"
          />
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-0">
        <div className="flex items-center justify-between w-full border-t pt-3">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 ${isLiked ? 'text-destructive' : ''}`}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs">{likesCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{commentsCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`gap-1.5 ${isHelpful ? 'text-primary' : ''}`}
              onClick={handleHelpful}
            >
              <ThumbsUp className={`h-4 w-4 ${isHelpful ? 'fill-current' : ''}`} />
              <span className="text-xs">Helpful</span>
            </Button>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowSaveDialog(true)}
            >
              <Bookmark className="h-4 w-4" />
              <span className="text-xs">Save</span>
            </Button>

            {/* Boost button for business accounts on their own posts */}
            {isOwnPost && isBusinessAccount && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-primary"
                onClick={() => setShowBoostDialog(true)}
              >
                <Rocket className="h-4 w-4" />
                <span className="text-xs">Boost</span>
              </Button>
            )}
          </div>
        </div>

        {showComments && <CommentsSection postId={post.id} comments={post.comments || []} />}
      </CardFooter>

      <SaveToBoard 
        open={showSaveDialog} 
        onOpenChange={setShowSaveDialog} 
        postId={post.id} 
      />

      {isOwnPost && isBusinessAccount && (
        <BoostPostDialog
          postId={post.id}
          open={showBoostDialog}
          onOpenChange={setShowBoostDialog}
        />
      )}
    </Card>
  );
}
