import { Link, useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, Users, Bookmark, Palette, Flag, Store, Sparkles, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeColor } from '@/types';
import { Badge } from '@/components/ui/badge';
import petsConnectLogo from '@/assets/petsconnect-logo.jpeg';


const themeOptions: { color: ThemeColor; label: string; preview: string }[] = [
  { color: 'teal', label: 'Teal', preview: 'bg-teal-500' },
  { color: 'amber', label: 'Amber', preview: 'bg-amber-500' },
  { color: 'sage', label: 'Sage', preview: 'bg-green-500' },
  { color: 'lavender', label: 'Lavender', preview: 'bg-purple-500' },
  { color: 'rose', label: 'Rose', preview: 'bg-rose-500' },
];

export function Header() {
  const { user, profile, signOut } = useAuth();
  const { themeColor, setThemeColor } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src={petsConnectLogo}
            alt="PetsConnect logo"
            className="h-10 w-auto"
            loading="eager"
          />
        </Link>


        {user && (
          <nav className="flex items-center gap-1 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Palette className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-semibold">Theme Color</div>
                <DropdownMenuSeparator />
                {themeOptions.map((theme) => (
                  <DropdownMenuItem
                    key={theme.color}
                    onClick={() => setThemeColor(theme.color)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div className={`w-4 h-4 rounded-full ${theme.preview}`} />
                    <span>{theme.label}</span>
                    {themeColor === theme.color && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/suggestions">
              <Button variant="ghost" size="icon" className="relative">
                <Sparkles className="h-5 w-5" />
              </Button>
            </Link>

            <Link to="/ai-life">
              <Button variant="ghost" size="icon" className="relative">
                <span className="text-lg">🤖</span>
              </Button>
            </Link>

            <Link to="/businesses">
              <Button variant="ghost" size="icon">
                <Store className="h-5 w-5" />
              </Button>
            </Link>

            <Link to="/groups">
              <Button variant="ghost" size="icon">
                <Users className="h-5 w-5" />
              </Button>
            </Link>

            <Link to="/friends">
              <Button variant="ghost" size="icon">
                <UserPlus className="h-5 w-5" />
              </Button>
            </Link>

            <Link to="/boards">
              <Button variant="ghost" size="icon">
                <Bookmark className="h-5 w-5" />
              </Button>
            </Link>

            <Link to="/messages">
              <Button variant="ghost" size="icon">
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>

            <Link to="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>

            <Link to="/report">
              <Button variant="ghost" size="icon">
                <Flag className="h-5 w-5" />
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.username} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {profile?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback>{profile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold">{profile?.username}</span>
                    <Badge variant="secondary" className="w-fit text-xs">
                      {profile?.points || 0} points
                    </Badge>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/tasks')}>
                  My Tasks
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        )}
      </div>
    </header>
  );
}
