import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MapPin, Clock, MessageCircle, Percent, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

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
  const { profile } = useAuth();

  if (!business) return null;

  const userDiscount = profile ? getDiscountTier(profile.points || 0) : { discount: 0, tier: 'None' };

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
              onClick={() => {
                onOpenChange(false);
                navigate('/messages');
              }}
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