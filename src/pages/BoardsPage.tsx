import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Bookmark, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function BoardsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newBoardName, setNewBoardName] = useState('');
  const [editingBoard, setEditingBoard] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: boards, isLoading } = useQuery({
    queryKey: ['boards', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('boards')
        .select('*, saved_posts(count)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const createBoard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('boards').insert({
        user_id: user?.id,
        name: newBoardName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setNewBoardName('');
      setIsCreateOpen(false);
      toast({ title: 'Board created!' });
    },
  });

  const updateBoard = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('boards').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setEditingBoard(null);
      toast({ title: 'Board updated!' });
    },
  });

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('boards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast({ title: 'Board deleted!' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Bookmark className="h-6 w-6" /> My Boards
          </h1>
          <p className="text-muted-foreground">Organize your saved posts</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" /> New Board
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Board</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Board name (e.g., Training Tips)"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
              />
              <Button
                onClick={() => createBoard.mutate()}
                disabled={!newBoardName.trim() || createBoard.isPending}
                className="w-full gradient-primary"
              >
                {createBoard.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Board'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {boards?.length === 0 ? (
          <Card className="col-span-full text-center py-8 text-muted-foreground">
            <p>No boards yet. Create one to start saving posts!</p>
          </Card>
        ) : (
          boards?.map((board: any) => (
            <Card key={board.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                {editingBoard?.id === board.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editingBoard.name}
                      onChange={(e) => setEditingBoard({ ...editingBoard, name: e.target.value })}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => updateBoard.mutate({ id: board.id, name: editingBoard.name })}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{board.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingBoard(board)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteBoard.mutate(board.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {board.saved_posts?.[0]?.count || 0} saved posts
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
