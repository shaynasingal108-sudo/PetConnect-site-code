import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PostCard } from '@/components/feed/PostCard';
import { Loader2 } from 'lucide-react';
import { fetchHydratedPosts } from '@/lib/posts';

export default function HomePage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user && profile && !profile.onboarding_completed) {
      navigate('/onboarding');
    }
  }, [user, profile, loading, navigate]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', profile?.city],
    queryFn: () => fetchHydratedPosts({ groupId: null, limit: 50 }),
    enabled: !!user,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });


  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center py-4">
        <h1 className="font-display text-2xl font-bold">Welcome back, {profile?.username}! 🐾</h1>
        <p className="text-muted-foreground">{profile?.city ? `Posts from ${profile.city}` : 'Your pet community feed'}</p>
      </div>

      <div className="space-y-4">
        {posts?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No posts yet. Be the first to share!</p>
          </div>
        ) : (
          posts?.map((post: any) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
