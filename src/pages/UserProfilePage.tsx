import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, User, MapPin, PawPrint, Calendar, UserPlus, MessageCircle, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile } = useAuth();
  const { toast } = useToast();

  const isOwnProfile = user?.id === userId;

  // Redirect to own profile page if viewing self
  if (isOwnProfile) {
    navigate('/profile');
    return null;
  }

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !isOwnProfile,
  });

  const handleAddFriend = async () => {
    if (!user || !userId) return;

    try {
      const { error } = await supabase.from('friends').insert({
        user_id: user.id,
        friend_id: userId,
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
        description: `Request sent to ${profile?.username}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleMessage = () => {
    navigate('/messages', { state: { selectedUserId: userId } });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
        <p className="text-muted-foreground mb-4">This user doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                {profile.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <h1 className="mt-4 text-2xl font-bold">{profile.username}</h1>
            
            {profile.is_business && (
              <Badge className="mt-2 bg-primary/10 text-primary">
                <Briefcase className="h-3 w-3 mr-1" />
                Business Account
              </Badge>
            )}
            
            {profile.bio && (
              <p className="mt-3 text-muted-foreground max-w-md">{profile.bio}</p>
            )}
            
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <Button onClick={handleAddFriend} variant="default" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Friend
              </Button>
              <Button onClick={handleMessage} variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Message
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Info */}
      {(profile.city || profile.neighborhood || profile.country) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {[profile.neighborhood, profile.city, profile.country].filter(Boolean).join(', ')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pet Info */}
      {(profile.pet_type || profile.pet_breed) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PawPrint className="h-5 w-5" />
              Pet Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.pet_type && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{profile.pet_type}</span>
              </div>
            )}
            {profile.pet_breed && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Breed</span>
                <span className="font-medium">{profile.pet_breed}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Business Info */}
      {profile.is_business && profile.business_name && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5" />
              Business Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Business Name</span>
              <span className="font-medium">{profile.business_name}</span>
            </div>
            {profile.business_category && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="secondary">{profile.business_category}</Badge>
              </div>
            )}
            {profile.business_years && profile.business_years > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Years in Business</span>
                <span className="font-medium">{profile.business_years} years</span>
              </div>
            )}
            {profile.business_description && (
              <div className="pt-2">
                <p className="text-muted-foreground text-sm">{profile.business_description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
