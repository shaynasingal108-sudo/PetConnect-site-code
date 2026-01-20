import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, User, Save, Camera, Star, Gift, Percent, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const petTypes = ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Other'];

const boostOptions = [
  { points: 10, hours: 2, level: 1, reach: '2 Hours', description: 'Top post for 2 hours' },
  { points: 25, hours: 6, level: 2, reach: '6 Hours', description: 'Top post for 6 hours' },
  { points: 50, hours: 24, level: 3, reach: '24 Hours', description: 'Top post for a full day' },
];
const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

// Discount tiers
const discountTiers = [
  { min: 0, max: 49, discount: 0, tier: 'Starter', color: 'bg-gray-500' },
  { min: 50, max: 99, discount: 5, tier: 'Bronze', color: 'bg-amber-600' },
  { min: 100, max: 199, discount: 10, tier: 'Silver', color: 'bg-gray-400' },
  { min: 200, max: 499, discount: 15, tier: 'Gold', color: 'bg-yellow-500' },
  { min: 500, max: Infinity, discount: 25, tier: 'Platinum', color: 'bg-purple-500' },
];

const getCurrentTier = (points: number) => {
  return discountTiers.find(t => points >= t.min && points <= t.max) || discountTiers[0];
};

const getNextTier = (points: number) => {
  const currentIndex = discountTiers.findIndex(t => points >= t.min && points <= t.max);
  return discountTiers[currentIndex + 1] || null;
};

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [boostDialogOpen, setBoostDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedBoost, setSelectedBoost] = useState(0);
  const [isBoostLoading, setIsBoostLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    bio: profile?.bio || '',
    gender: profile?.gender || '',
    city: profile?.city || '',
    neighborhood: profile?.neighborhood || '',
    pet_type: profile?.pet_type || '',
    pet_breed: profile?.pet_breed || '',
    is_business: profile?.is_business || false,
    business_name: profile?.business_name || '',
    business_category: profile?.business_category || '',
    business_description: profile?.business_description || '',
    business_years: profile?.business_years || 0,
  });

  // Fetch user's posts for business accounts
  const { data: myPosts } = useQuery({
    queryKey: ['my-posts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && profile?.is_business,
  });

  const handleBoostPost = async () => {
    if (!profile || !selectedPostId) return;
    
    const selectedOption = boostOptions[selectedBoost];
    const currentPoints = profile.points || 0;
    
    if (currentPoints < selectedOption.points) {
      toast({
        title: 'Not enough points',
        description: `You need ${selectedOption.points} points to use this boost.`,
        variant: 'destructive',
      });
      return;
    }

    setIsBoostLoading(true);
    try {
      const boostUntil = new Date();
      boostUntil.setHours(boostUntil.getHours() + selectedOption.hours);

      const { error: postError } = await supabase
        .from('posts')
        .update({ 
          boost_until: boostUntil.toISOString(),
          boost_level: selectedOption.level 
        })
        .eq('id', selectedPostId);

      if (postError) throw postError;

      const newPoints = currentPoints - selectedOption.points;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', profile.id);

      if (profileError) throw profileError;
      
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      
      toast({
        title: 'Post Boosted! 🚀',
        description: `Your post will be at the top for ${selectedOption.hours} hours. ${selectedOption.points} points used.`,
      });
      
      setBoostDialogOpen(false);
      setSelectedPostId(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsBoostLoading(false);
    }
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', profile?.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      toast({ title: 'Profile Updated!', description: 'Your changes have been saved.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const points = profile?.points || 0;
  const currentTier = getCurrentTier(points);
  const nextTier = getNextTier(points);
  const progressToNext = nextTier 
    ? ((points - currentTier.min) / (nextTier.min - currentTier.min)) * 100 
    : 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center py-4">
        <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
          <User className="h-6 w-6" /> My Profile
        </h1>
      </div>

      {/* Points & Rewards Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" /> 
            {profile?.is_business ? 'Business Points' : 'My Rewards'}
          </CardTitle>
          <CardDescription>
            {profile?.is_business 
              ? 'Use points to boost your posts and reach more customers'
              : 'Earn points for discounts at pet businesses'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-primary">{points}</p>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </div>
            <Badge className={`${currentTier.color} text-white px-3 py-1`}>
              {currentTier.tier === 'Bronze' && '🥉 '}
              {currentTier.tier === 'Silver' && '🥈 '}
              {currentTier.tier === 'Gold' && '🥇 '}
              {currentTier.tier === 'Platinum' && '💎 '}
              {currentTier.tier}
            </Badge>
          </div>

          {!profile?.is_business && (
            <>
              <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                <Percent className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">
                    {currentTier.discount}% Discount
                  </p>
                  <p className="text-xs text-muted-foreground">At all registered businesses</p>
                </div>
              </div>

              {nextTier && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress to {nextTier.tier}</span>
                    <span className="font-medium">{nextTier.min - points} pts to go</span>
                  </div>
                  <Progress value={progressToNext} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Unlock {nextTier.discount}% discount at {nextTier.min} points
                  </p>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2">
                {discountTiers.slice(1).map((tier) => (
                  <div key={tier.tier} className={`p-2 rounded ${points >= tier.min ? 'bg-primary/10' : 'bg-muted/50'}`}>
                    <p className="font-medium">{tier.tier}</p>
                    <p className="text-muted-foreground">{tier.discount}% off</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {profile?.is_business && (
            <div className="p-3 bg-background rounded-lg">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Boost Your Posts</p>
                  <p className="text-xs text-muted-foreground">
                    Use points to increase visibility on user feeds and AI recommendations
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Posts Section for Business Accounts */}
      {profile?.is_business && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" /> Boost Your Posts
            </CardTitle>
            <CardDescription>
              Select a post to boost it to the top of users' feeds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {myPosts && myPosts.length > 0 ? (
              myPosts.map((post: any) => {
                const isBoosted = post.boost_until && new Date(post.boost_until) > new Date();
                return (
                  <div 
                    key={post.id} 
                    className={`p-3 rounded-lg border ${isBoosted ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{post.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {isBoosted ? (
                        <Badge variant="default" className="shrink-0 bg-primary/90">
                          <Rocket className="h-3 w-3 mr-1" />
                          Boosted
                        </Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="shrink-0"
                          onClick={() => {
                            setSelectedPostId(post.id);
                            setSelectedBoost(0);
                            setBoostDialogOpen(true);
                          }}
                        >
                          <Rocket className="h-3 w-3 mr-1" />
                          Boost
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No posts yet. Create a post to start boosting!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Boost Dialog */}
      <Dialog open={boostDialogOpen} onOpenChange={setBoostDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" /> Boost Your Post
            </DialogTitle>
            <DialogDescription>
              Use your points to make this post appear at the top of feeds
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Your Points</p>
              <p className="text-3xl font-bold text-primary">{points}</p>
            </div>

            <div className="space-y-4">
              {boostOptions.map((option, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedBoost(index)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedBoost === index
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  } ${points < option.points ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${selectedBoost === index ? 'bg-primary/20' : 'bg-muted'}`}>
                        <Sparkles className={`h-4 w-4 ${selectedBoost === index ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-semibold">{option.reach}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{option.points}</p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleBoostPost}
              disabled={isBoostLoading || points < boostOptions[selectedBoost].points}
              className="w-full gradient-primary"
            >
              {isBoostLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Rocket className="h-4 w-4 mr-2" />
              )}
              Boost for {boostOptions[selectedBoost].points} Points
            </Button>

            {points < boostOptions[selectedBoost].points && (
              <p className="text-xs text-center text-destructive">
                You need {boostOptions[selectedBoost].points - points} more points for this boost
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="text-2xl">{profile?.username?.charAt(0)}</AvatarFallback>
          </Avatar>
          <Button variant="outline">
            <Camera className="h-4 w-4 mr-2" /> Change Photo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>{genders.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Neighborhood</Label>
              <Input
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pet Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pet Type</Label>
              <Select value={formData.pet_type} onValueChange={(v) => setFormData({ ...formData, pet_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{petTypes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Breed</Label>
              <Input
                value={formData.pet_breed}
                onChange={(e) => setFormData({ ...formData, pet_breed: e.target.value })}
                placeholder="e.g., Golden Retriever"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Business Account</CardTitle>
            <Switch
              checked={formData.is_business}
              onCheckedChange={(v) => setFormData({ ...formData, is_business: v })}
            />
          </div>
        </CardHeader>
        {formData.is_business && (
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.business_category} onValueChange={(v) => setFormData({ ...formData, business_category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Products">Products</SelectItem>
                    <SelectItem value="Daycare">Daycare</SelectItem>
                    <SelectItem value="Grooming">Grooming</SelectItem>
                    <SelectItem value="Veterinary">Veterinary</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Business Description</Label>
              <Textarea
                value={formData.business_description}
                onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Years in Business</Label>
              <Input
                type="number"
                value={formData.business_years}
                onChange={(e) => setFormData({ ...formData, business_years: parseInt(e.target.value) || 0 })}
              />
            </div>
          </CardContent>
        )}
      </Card>

      <Button
        onClick={() => updateProfile.mutate()}
        disabled={updateProfile.isPending}
        className="w-full gradient-primary"
      >
        {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Save Changes
      </Button>
    </div>
  );
}
