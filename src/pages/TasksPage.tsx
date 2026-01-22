import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, Circle, Star, Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function TasksPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Check if all today's tasks are completed (for bonus)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStartIso = today.toISOString();
  const todaysTasks = tasks?.filter((t: any) => new Date(t.created_at) >= today) || [];
  const todaysPendingTasks = todaysTasks.filter((t: any) => !t.completed);
  const todaysCompletedTasks = todaysTasks.filter((t: any) => t.completed);
  const hasGeneratedToday = todaysTasks.length > 0;

  const getTaskRequirement = (title: string): { metric: 'likes' | 'saves' | 'helpful' | 'comments' | 'posts'; target: number } | null => {
    const t = (title || '').toLowerCase();
    const num = (re: RegExp, fallback: number) => {
      const m = t.match(re);
      if (!m) return fallback;
      const n = Number(m[1]);
      return Number.isFinite(n) ? n : fallback;
    };

    if (t.includes('create a new post')) return { metric: 'posts', target: 1 };
    if (t.includes('helpful')) return { metric: 'helpful', target: num(/get\s+(\d+)\s+helpful/i, 1) };
    if (t.includes('save')) return { metric: 'saves', target: num(/get\s+(\d+)\s+saves?/i, 1) };
    if (t.includes('comment')) return { metric: 'comments', target: num(/get\s+(\d+)\s+comments?/i, 1) };
    if (t.includes('like')) return { metric: 'likes', target: num(/get\s+(\d+)\s+likes?/i, 1) };
    return null;
  };

  const computeTodayMetrics = async () => {
    if (!user) {
      return { likes: 0, saves: 0, helpful: 0, comments: 0, posts: 0 };
    }

    // Fetch up to 1000 of the user's posts to compute engagement received today.
    // (If a user has more than 1000 posts, counts may be underreported.)
    const { data: myPosts, error: postsError } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', user.id)
      .limit(1000);
    if (postsError) throw postsError;

    const postIds = (myPosts || []).map((p: any) => p.id);

    const countFor = async (
      table: 'likes' | 'saved_posts' | 'helpful_marks' | 'comments',
      extra?: (q: any) => any
    ) => {
      if (postIds.length === 0) return 0;
      let q = supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .in('post_id', postIds)
        .gte('created_at', todayStartIso);
      if (extra) q = extra(q);
      const { count, error } = await q;
      if (error) throw error;
      return count || 0;
    };

    const likes = await countFor('likes');
    const saves = await countFor('saved_posts');
    const helpful = await countFor('helpful_marks');
    const comments = await countFor('comments', (q) => q.neq('user_id', user.id));

    const { count: posts, error: postsTodayError } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', todayStartIso);
    if (postsTodayError) throw postsTodayError;

    return {
      likes,
      saves,
      helpful,
      comments,
      posts: posts || 0,
    };
  };

  const { data: todayMetrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['task-metrics', user?.id, todayStartIso],
    queryFn: computeTodayMetrics,
    enabled: !!user && hasGeneratedToday,
    refetchOnWindowFocus: true,
  });

  const completeTask = useMutation({
    mutationFn: async ({ taskId, points }: { taskId: string; points: number }) => {
      if (!user) throw new Error('Not signed in');

      // Ensure the task is actually completed before allowing the user to claim it.
      const { data: taskRow, error: taskFetchError } = await supabase
        .from('tasks')
        .select('id, user_id, title, created_at, completed')
        .eq('id', taskId)
        .single();
      if (taskFetchError) throw taskFetchError;
      if (!taskRow || taskRow.user_id !== user.id) throw new Error('Task not found');
      if (taskRow.completed) return { bonusPoints: 0, totalPoints: 0 };
      if (new Date(taskRow.created_at) < today) throw new Error('This task is no longer claimable');

      const req = getTaskRequirement(taskRow.title);
      if (req) {
        const metricsNow = await computeTodayMetrics();
        const progress = metricsNow[req.metric];
        if (progress < req.target) {
          throw new Error(`Not completed yet (${progress}/${req.target}). Finish the task first.`);
        }
      }

      // Mark task as completed
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ completed: true })
        .eq('id', taskId);
      if (taskError) throw taskError;

      // Check if this is the last task being completed today (for bonus)
      const { count: remainingCount, error: remainingError } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', todayStartIso)
        .eq('completed', false);
      if (remainingError) throw remainingError;

      const { count: totalTodayCount, error: totalTodayError } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', todayStartIso);
      if (totalTodayError) throw totalTodayError;

      const isLastTask = (remainingCount || 0) === 0 && (totalTodayCount || 0) >= 5;
      const bonusPoints = isLastTask ? 3 : 0;
      const totalPoints = points + bonusPoints;

      // Add points to profile (including bonus if applicable)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ points: (profile?.points || 0) + totalPoints })
        .eq('id', profile?.id);
      if (profileError) throw profileError;

      return { bonusPoints, totalPoints };
    },
    onSuccess: async (result, { points }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-metrics'] });
      await refreshProfile();
      
      if (result?.bonusPoints && result.bonusPoints > 0) {
        toast({ 
          title: '🎉 All Tasks Completed!', 
          description: `You earned ${points} + ${result.bonusPoints} bonus points! Total: ${result.totalPoints} points!` 
        });
      } else {
        toast({ title: 'Task Completed!', description: `You earned ${points} points! 🎉` });
      }
    },
  });

  // Show bonus progress
  const allTasksCompleted = hasGeneratedToday && todaysPendingTasks.length === 0 && todaysCompletedTasks.length >= 5;

  const generateNewTasks = async () => {
    if (!user || !profile?.pet_type) {
      toast({
        title: 'Pet info needed',
        description: 'Please set your pet type in your profile first.',
        variant: 'destructive',
      });
      return;
    }

    if (hasGeneratedToday) {
      toast({
        title: 'Already generated today!',
        description: 'Come back tomorrow for new daily tasks.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-tasks', {
        body: {
          userId: user.id,
          petType: profile.pet_type,
          petBreed: profile.pet_breed,
        },
      });

      // Check for already generated error (returned as 400 from backend)
      if (response.data?.alreadyGenerated || response.error?.message?.includes('already generated')) {
        toast({
          title: 'Already generated today!',
          description: 'Come back tomorrow for new daily tasks.',
        });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        return;
      }

      if (response.error) throw response.error;

      toast({ title: '5 Daily Tasks Generated!', description: 'Complete them to earn 5 points!' });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      console.error('Error generating tasks:', error);
      toast({
        title: 'Could not generate tasks',
        description: error?.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingTasks = tasks?.filter((t: any) => !t.completed) || [];
  const completedTasks = tasks?.filter((t: any) => t.completed) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center py-4">
        <h1 className="font-display text-2xl font-bold">Daily Tasks</h1>
        <p className="text-muted-foreground">Complete tasks to earn points!</p>
        <div className="mt-2 inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
          <Star className="h-5 w-5 text-primary" />
          <span className="font-semibold">{profile?.points || 0} points</span>
        </div>
      </div>

      {/* Bonus Progress */}
      {hasGeneratedToday && (
        <Card className={`border-2 ${allTasksCompleted ? 'border-green-500 bg-green-500/10' : 'border-primary/30'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className={`h-5 w-5 ${allTasksCompleted ? 'text-green-500' : 'text-primary'}`} />
                <span className="font-semibold">
                  {allTasksCompleted ? 'Bonus Earned!' : 'Complete All Tasks Bonus'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {todaysCompletedTasks.length}/{todaysTasks.length} completed
                </span>
                <span className={`font-bold ${allTasksCompleted ? 'text-green-500' : 'text-primary'}`}>
                  +3 <Star className="h-4 w-4 inline" />
                </span>
              </div>
            </div>
            {!allTasksCompleted && (
              <p className="text-xs text-muted-foreground mt-2">
                Complete all 5 daily tasks to earn 3 bonus points!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Points Explanation */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="pt-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" /> How to Earn Points
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ Complete daily tasks (1-5 points each)</li>
            <li>✓ Get likes on your posts (+1 point each)</li>
            <li>✓ Get comments on your posts (+1 point each)</li>
            <li>✓ Get "Helpful" marks on posts (+2 points each)</li>
            <li>✓ Have your posts saved by others (+1 point each)</li>
            <li>✓ Update your AI Life (+2 points each entry)</li>
          </ul>
          {profile?.is_business ? (
            <p className="text-xs text-primary mt-2">💼 As a business, use points to boost your posts!</p>
          ) : (
            <p className="text-xs text-primary mt-2">🎁 Earn points for discounts at pet businesses!</p>
          )}
        </CardContent>
      </Card>

      {/* Generate Tasks Button */}
      <Button
        onClick={generateNewTasks}
        disabled={isGenerating || hasGeneratedToday}
        variant="outline"
        className="w-full gap-2"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : hasGeneratedToday ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {hasGeneratedToday
          ? 'Tasks Generated Today ✓'
          : `Generate AI Tasks for My ${profile?.pet_type || 'Pet'}`}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Today's Tasks</CardTitle>
          <CardDescription>
            AI-generated tasks based on your {profile?.pet_type || 'pet'} care needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingTasks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>{hasGeneratedToday ? 'All tasks claimed for today!' : 'No pending tasks! Generate new ones with AI.'}</p>
            </div>
          ) : (
            todaysPendingTasks.map((task: any) => {
              const req = getTaskRequirement(task.title);
              const progress = req ? (todayMetrics?.[req.metric] ?? 0) : 0;
              const target = req?.target ?? 0;
              const canClaim = !req || progress >= target;

              return (
              <button
                key={task.id}
                onClick={() => completeTask.mutate({ taskId: task.id, points: task.points || 2 })}
                disabled={completeTask.isPending || loadingMetrics || !canClaim}
                className="w-full flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
              >
                <Circle className={`h-6 w-6 flex-shrink-0 ${canClaim ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                  )}
                  {req && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Progress: {Math.min(progress, target)}/{target} {canClaim ? '• Ready to claim' : '• Not complete yet'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-primary font-semibold flex-shrink-0">
                  +{task.points || 2} <Star className="h-4 w-4" />
                </div>
              </button>
              );
            })
          )}
        </CardContent>
      </Card>

      {todaysCompletedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysCompletedTasks.slice(0, 10).map((task: any) => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30 opacity-60"
              >
                <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold line-through truncate">{task.title}</p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground font-semibold flex-shrink-0">
                  +{task.points || 2} <Star className="h-4 w-4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
