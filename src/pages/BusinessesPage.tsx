import { useQuery } from '@tanstack/react-query';
import { Loader2, Store, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

export default function BusinessesPage() {
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

      <div className="grid gap-4 sm:grid-cols-2">
        {businesses?.length === 0 ? (
          <Card className="col-span-full text-center py-12 text-muted-foreground">
            <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No businesses registered yet.</p>
            <p className="text-sm">Are you a pet business? Apply from your profile!</p>
          </Card>
        ) : (
          businesses?.map((biz: any) => (
            <Card key={biz.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 rounded-xl">
                    <AvatarImage src={biz.business_logo || biz.avatar_url} />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl">
                      {biz.business_name?.charAt(0) || 'B'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{biz.business_name || biz.username}</h3>
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        {biz.points || 0}
                      </Badge>
                    </div>
                    {biz.business_category && (
                      <Badge variant="outline" className="mt-1">{biz.business_category}</Badge>
                    )}
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
    </div>
  );
}
