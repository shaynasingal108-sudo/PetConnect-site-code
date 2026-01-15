import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MapPin, Clock, MessageCircle, Percent, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface BusinessDetailDialogProps {
  business: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Discount tiers based on user points
const getDiscountTier = (points: number) => {
  if (points >= 500) return { discount: 25, tier: 'Platinum' };
  if (points >= 200) return { discount: 15, tier: 'Gold' };
  if (points >= 100) return { discount: 10, tier: 'Silver' };
  if (points >= 50) return { discount: 5, tier: 'Bronze' };
  return { discount: 0, tier: 'None' };
};

export function BusinessDetailDialog({ business, open, onOpenChange }: BusinessDetailDialogProps) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  const businessUserId = business?.user_id;

  // Fetch ratings for this business
  const { data: ratings } = useQuery({
    queryKey: ['business-ratings', businessUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_ratings')
        .select('*')
        .eq('business_id', businessUserId);
      return data || [];
    },
    enabled: !!businessUserId && open,
  });

  // Check if current user has rated
  const { data: userRating } = useQuery({
    queryKey: ['user-business-rating', businessUserId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_ratings')
        .select('*')
        .eq('business_id', businessUserId)
        .eq('user_id', user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!businessUserId && !!user?.id && open,
  });

  useEffect(() => {
    if (userRating) {
      setSelectedRating(userRating.rating);
    } else {
      setSelectedRating(0);
    }
  }, [userRating]);

  const userDiscount = profile ? getDiscountTier(profile.points || 0) : { discount: 0, tier: 'None' };

  if (!business) return null;

  const submitRating = useMutation({
    mutationFn: async (rating: number) => {
      if (userRating) {
        // Update existing rating
        const { error } = await supabase
          .from('business_ratings')
          .update({ rating })
          .eq('id', userRating.id);
        if (error) throw error;
      } else {
        // Insert new rating
        const { error } = await supabase
          .from('business_ratings')
          .insert({
            business_id: business.user_id,
            user_id: user?.id,
            rating,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-ratings', business.user_id] });
      queryClient.invalidateQueries({ queryKey: ['user-business-rating', business.user_id, user?.id] });
      toast({ title: 'Rating submitted!', description: 'Thank you for your feedback.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleRatingClick = (rating: number) => {
    if (!user) {
      toast({ title: 'Please log in', description: 'You need to be logged in to rate businesses.', variant: 'destructive' });
      return;
    }
    if (profile?.is_business) {
      toast({ title: 'Cannot rate', description: 'Business accounts cannot rate other businesses.', variant: 'destructive' });
      return;
    }
    setSelectedRating(rating);
    submitRating.mutate(rating);
  };

  const handleContactBusiness = async () => {
    if (!user) {
      toast({ title: 'Please log in', description: 'You need to be logged in to message businesses.', variant: 'destructive' });
      return;
    }
    
    // Send initial message to the business
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: business.user_id,
      content: `Hi! I'm interested in your services at ${business.business_name}. I found you on PetsConnect!`,
    });

    if (error) {
      toast({ title: 'Error', description: 'Could not send message.', variant: 'destructive' });
    } else {
      toast({ title: 'Message sent!', description: 'Check your messages to continue the conversation.' });
      onOpenChange(false);
      navigate('/messages');
    }
  };

  // Calculate average rating
  const averageRating = ratings && ratings.length > 0
    ? (ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  const ratingCount = ratings?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{business.business_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 rounded-xl">
              <AvatarImage src={business.business_logo || business.avatar_url} />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl">
                {business.business_name?.charAt(0) || 'B'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{business.business_name || business.username}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {business.business_category && (
                  <Badge variant="secondary">{business.business_category}</Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                  {business.points || 0} pts
                </Badge>
              </div>
            </div>
          </div>

          {/* Average Rating Display */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    averageRating && star <= Math.round(Number(averageRating))
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <div>
              {averageRating ? (
                <p className="font-semibold">{averageRating} / 5 <span className="text-sm font-normal text-muted-foreground">({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})</span></p>
              ) : (
                <p className="text-muted-foreground text-sm">No ratings yet - be the first!</p>
              )}
            </div>
          </div>

          {/* User Rating */}
          {user && !profile?.is_business && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Rate this business:</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                    disabled={submitRating.isPending}
                  >
                    <Star
                      className={`h-7 w-7 cursor-pointer transition-colors ${
                        star <= (hoverRating || selectedRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground hover:text-yellow-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {selectedRating > 0 && (
                <p className="text-xs text-muted-foreground">
                  {userRating ? 'Your rating has been updated!' : 'Thanks for rating!'}
                </p>
              )}
            </div>
          )}

          <p className="text-muted-foreground">
            {business.business_description || business.bio || 'No description available'}
          </p>

          <div className="space-y-2 text-sm">
            {business.city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{business.city}</span>
              </div>
            )}
            {business.business_years && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{business.business_years} years in business</span>
              </div>
            )}
          </div>

          {/* User Discount Card */}
          {profile && !profile.is_business && (
            <Card className={`${userDiscount.discount > 0 ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20' : 'bg-muted/50'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${userDiscount.discount > 0 ? 'bg-green-500/20' : 'bg-muted'}`}>
                    {userDiscount.discount > 0 ? (
                      <Percent className="h-5 w-5 text-green-600" />
                    ) : (
                      <Gift className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    {userDiscount.discount > 0 ? (
                      <>
                        <p className="font-semibold text-green-700 dark:text-green-400">
                          {userDiscount.discount}% OFF - {userDiscount.tier} Member
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Show this to the business for your discount!
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">Earn points for discounts!</p>
                        <p className="text-xs text-muted-foreground">
                          50 pts = 5% off • 100 pts = 10% off • 200 pts = 15% off
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discount Tiers Info */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-sm mb-2">Discount Tiers:</p>
            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
              <span>🥉 Bronze (50+ pts): 5% off</span>
              <span>🥈 Silver (100+ pts): 10% off</span>
              <span>🥇 Gold (200+ pts): 15% off</span>
              <span>💎 Platinum (500+ pts): 25% off</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={handleContactBusiness}
              className="w-full gradient-primary"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Business
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}