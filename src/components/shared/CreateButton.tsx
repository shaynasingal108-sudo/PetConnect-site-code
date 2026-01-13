import { useState } from 'react';
import { Plus, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreatePostDialog } from './CreatePostDialog';
import { CreateGroupDialog } from './CreateGroupDialog';

export function CreateButton() {
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-elevated gradient-primary hover:opacity-90 transition-all hover:scale-105"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="mb-2">
            <DropdownMenuItem onClick={() => setShowPostDialog(true)} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4" />
              Create Post
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowGroupDialog(true)} className="gap-2 cursor-pointer">
              <Users className="h-4 w-4" />
              Create Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreatePostDialog open={showPostDialog} onOpenChange={setShowPostDialog} />
      <CreateGroupDialog open={showGroupDialog} onOpenChange={setShowGroupDialog} />
    </>
  );
}
