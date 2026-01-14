import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Clock, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BusinessDetailDialogProps {
  business: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessDetailDialog({ business, open, onOpenChange }: BusinessDetailDialogProps) {
  const navigate = useNavigate();

  if (!business) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
              <div className="flex items-center gap-2 mt-1">
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