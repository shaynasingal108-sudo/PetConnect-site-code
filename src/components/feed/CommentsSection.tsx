import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Comment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface CommentsSectionProps {
  postId: string;
  comments: Comment[];
}

export function CommentsSection({ postId, comments }: CommentsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !newComment.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('comments').insert({
        user_id: user.id,
        post_id: postId,
        parent_id: replyTo,
        content: newComment.trim(),
      });
      if (error) throw error;

      // Award 1 point to post author for receiving a comment
      const { data: postRow } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (postRow?.user_id && postRow.user_id !== user.id) {
        const { data: authorProfile } = await supabase
          .from('profiles')
          .select('points')
          .eq('user_id', postRow.user_id)
          .single();

        if (authorProfile) {
          await supabase
            .from('profiles')
            .update({ points: (authorProfile.points || 0) + 1 })
            .eq('user_id', postRow.user_id);
        }
      }

      setNewComment('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const topLevelComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="w-full space-y-3 border-t pt-3">
      <div className="flex gap-2">
        <Input
          placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="flex-1"
        />
        <Button 
          size="icon" 
          onClick={handleSubmit} 
          disabled={isLoading || !newComment.trim()}
          className="gradient-primary"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {replyTo && (
        <p className="text-xs text-muted-foreground">
          Replying to comment...{' '}
          <button className="text-primary" onClick={() => setReplyTo(null)}>
            Cancel
          </button>
        </p>
      )}

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {topLevelComments.map((comment) => (
          <div key={comment.id} className="space-y-2">
            <CommentItem 
              comment={comment} 
              onReply={() => setReplyTo(comment.id)} 
            />
            {getReplies(comment.id).map((reply) => (
              <div key={reply.id} className="ml-8">
                <CommentItem comment={reply} onReply={() => setReplyTo(reply.id)} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentItem({ comment, onReply }: { comment: Comment; onReply: () => void }) {
  return (
    <div className="flex gap-2">
      <Avatar className="h-7 w-7">
        <AvatarImage src={comment.profiles?.avatar_url} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {comment.profiles?.username?.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs">{comment.profiles?.username}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm">{comment.content}</p>
        <button 
          className="text-xs text-primary hover:underline mt-1"
          onClick={onReply}
        >
          Reply
        </button>
      </div>
    </div>
  );
}
