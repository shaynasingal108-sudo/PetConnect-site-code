import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Board } from '@/types';

interface SaveToBoardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

export function SaveToBoard({ open, onOpenChange, postId }: SaveToBoardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchBoards();
    }
  }, [open, user]);

  const fetchBoards = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setBoards(data as Board[]);
    }
  };

  const createBoard = async () => {
    if (!user || !newBoardName.trim()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({
          user_id: user.id,
          name: newBoardName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setBoards([data as Board, ...boards]);
      setNewBoardName('');
      toast({
        title: 'Board created!',
        description: `"${newBoardName}" has been created.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const saveToBoard = async (boardId: string | null) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('saved_posts').insert({
        user_id: user.id,
        post_id: postId,
        board_id: boardId,
      });

      if (error && error.code === '23505') {
        toast({
          title: 'Already saved',
          description: 'This post is already saved.',
        });
        onOpenChange(false);
        return;
      }

      if (error) throw error;

      toast({
        title: 'Post saved!',
        description: boardId 
          ? `Saved to "${boards.find(b => b.id === boardId)?.name}"`
          : 'Saved to your collection',
      });
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-display">Save to Board</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Create new board..."
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createBoard()}
            />
            <Button 
              size="icon" 
              onClick={createBoard}
              disabled={isCreating || !newBoardName.trim()}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => saveToBoard(null)}
              disabled={isLoading}
            >
              Save without board
            </Button>
            {boards.map((board) => (
              <Button
                key={board.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => saveToBoard(board.id)}
                disabled={isLoading}
              >
                {board.name}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
