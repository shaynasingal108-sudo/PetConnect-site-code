import { useState } from 'react';
import { Loader2, Store, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ApplyBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const businessCategories = [
  'Pet Training',
  'Pet Products',
  'Pet Daycare',
  'Pet Grooming',
  'Veterinary Services',
  'Pet Food',
  'Pet Accessories',
  'Pet Photography',
  'Pet Sitting',
  'Other',
];

export function ApplyBusinessDialog({ open, onOpenChange }: ApplyBusinessDialogProps) {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    businessCategory: '',
    businessDescription: '',
    businessYears: '',
    businessLogo: '',
  });

  const handleSubmit = async () => {
    if (!user || !formData.businessName || !formData.businessCategory) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_business: true,
          business_name: formData.businessName,
          business_category: formData.businessCategory,
          business_description: formData.businessDescription,
          business_years: parseInt(formData.businessYears) || null,
          business_logo: formData.businessLogo || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Business account created! 🎉',
        description: 'You can now start posting as a business and earn boost points.',
      });

      await refreshProfile();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (profile?.is_business) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Already a Business</DialogTitle>
            <DialogDescription>
              You're already registered as a business account. Manage your business from your profile page.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Store className="h-5 w-5" /> Apply as a Business
          </DialogTitle>
          <DialogDescription>
            Register your pet business to reach more customers. Earn points to boost your visibility!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Business Name *</Label>
            <Input
              placeholder="e.g., Happy Paws Training"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Select
              value={formData.businessCategory}
              onValueChange={(v) => setFormData({ ...formData, businessCategory: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="What type of business?" />
              </SelectTrigger>
              <SelectContent>
                {businessCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Years in Business</Label>
            <Input
              type="number"
              placeholder="e.g., 5"
              value={formData.businessYears}
              onChange={(e) => setFormData({ ...formData, businessYears: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Business Description</Label>
            <Textarea
              placeholder="Tell us about your business, services, and what makes you special..."
              value={formData.businessDescription}
              onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/logo.png"
                value={formData.businessLogo}
                onChange={(e) => setFormData({ ...formData, businessLogo: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
            <h4 className="font-medium">How Points Work for Businesses:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Earn points from likes, helpful marks, and saves on your posts</li>
              <li>Use points to boost your posts to more users' feeds</li>
              <li>Higher points = better AI recommendation placement</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.businessName || !formData.businessCategory}
            className="gradient-primary"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Store className="h-4 w-4 mr-2" />}
            Apply as Business
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
