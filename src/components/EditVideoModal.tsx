
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SavedVideo } from "@/contexts/VideoLibraryContext";

interface EditVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<SavedVideo>) => void;
  video: SavedVideo;
}

export function EditVideoModal({ isOpen, onClose, onSave, video }: EditVideoModalProps) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [category, setCategory] = useState(video.category);
  const [isPublic, setIsPublic] = useState(video.isPublic);

  const handleSave = () => {
    onSave({
      title,
      description,
      category: category as "wisdom" | "story" | "love" | "advice",
      isPublic
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description"
              rows={3}
            />
          </div>
          
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(value: string) => setCategory(value as "wisdom" | "story" | "love" | "advice")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wisdom">Wisdom</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="love">Love</SelectItem>
                <SelectItem value="advice">Advice</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <Label htmlFor="public">Make this video public</Label>
          </div>
          
          {video.prompt && (
            <div>
              <Label>Original Prompt</Label>
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                {video.prompt}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
