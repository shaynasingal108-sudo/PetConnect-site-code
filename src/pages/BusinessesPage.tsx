import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Store, Star, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ApplyBusinessDialog } from '@/components/business/ApplyBusinessDialog';
import { BusinessDetailDialog } from '@/components/business/BusinessDetailDialog';

export default function BusinessesPage() {
  const { profile } = useAuth();
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_business', true)
        .order('points', { ascending: false });
      return data || [];
    },
  });

  // Fetch all ratings
  const { data: allRatings } = useQuery({
    queryKey: ['all-business-ratings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_ratings')
        .select('*');
      return data || [];
    },
  });

  // Calculate average rating for each business
  const getBusinessRating = (businessUserId: string) => {
    const businessRatings = allRatings?.filter((r: any) => r.business_id === businessUserId) || [];
    if (businessRatings.length === 0) return null;
    const avg = businessRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / businessRatings.length;
    return { average: avg.toFixed(1), count: businessRatings.length };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center py-4">
        <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
          <Store className="h-6 w-6" /> Pet Businesses
        </h1>
        <p className="text-muted-foreground">Discover trusted pet services and products</p>
      </div>

      {!profile?.is_business && (
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Are you a pet business?</h3>
                <p className="text-sm text-muted-foreground">Register to reach more customers and earn boost points!</p>
              </div>
              <Button onClick={() => setShowApplyDialog(true)} className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" /> Apply Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {businesses?.length === 0 ? (
          <Card className="col-span-full text-center py-12 text-muted-foreground">
            <CardContent>
              <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No businesses registered yet.</p>
              <p className="text-sm">Be the first to register!</p>
            </CardContent>
          </Card>
        ) : (
          businesses?.map((biz: any) => (
            <Card 
              key={biz.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedBusiness(biz)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 rounded-xl">
                    <AvatarImage src={biz.business_logo || biz.avatar_url} />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl">
                      {biz.business_name?.charAt(0) || 'B'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{biz.business_name || biz.username}</h3>
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        {biz.points || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {biz.business_category && (
                        <Badge variant="outline">{biz.business_category}</Badge>
                      )}
                      {(() => {
                        const rating = getBusinessRating(biz.user_id);
                        return rating ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{rating.average}</span>
                            <span>({rating.count})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No ratings yet</span>
                        );
                      })()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {biz.business_description || biz.bio || 'No description available'}
                    </p>
                    {biz.business_years && (
                      <p className="text-xs text-muted-foreground mt-2">
                        🕐 {biz.business_years} years in business
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <ApplyBusinessDialog open={showApplyDialog} onOpenChange={setShowApplyDialog} />
      <BusinessDetailDialog 
        business={selectedBusiness} 
        open={!!selectedBusiness} 
        onOpenChange={(open) => !open && setSelectedBusiness(null)} 
      />
    </div>
  );
}