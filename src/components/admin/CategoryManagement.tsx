import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCategories, type VideoCategory, type CategoryWithIcon } from '@/contexts/CategoriesContext';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  GripVertical, 
  Tag,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Star
} from 'lucide-react';

// Available icons for categories
const AVAILABLE_ICONS = [
  'Lightbulb', 'MessageCircle', 'Heart', 'Clock', 'Globe', 'Star', 
  'Bookmark', 'Calendar', 'Music', 'Camera', 'Gift', 'Circle'
];

// Color options for categories
const COLOR_OPTIONS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F97316', // Orange
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
];

interface CategoryFormData {
  value: string;
  label: string;
  description: string;
  icon_name: string;
  emoji: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
}

export function CategoryManagement() {
  const { categories, loading, isConnected, createCategory, updateCategory, deleteCategory, reorderCategories, refreshCategories } = useCategories();
  const { toast } = useToast();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithIcon | null>(null);
  const [working, setWorking] = useState(false);
  
  const [formData, setFormData] = useState<CategoryFormData>({
    value: '',
    label: '',
    description: '',
    icon_name: 'Circle',
    emoji: '📝',
    color: '#3B82F6',
    sort_order: 0,
    is_active: true,
    is_default: false,
  });

  const resetForm = () => {
    setFormData({
      value: '',
      label: '',
      description: '',
      icon_name: 'Circle',
      emoji: '📝',
      color: '#3B82F6',
      sort_order: categories.length,
      is_active: true,
      is_default: false,
    });
  };

  const handleCreate = () => {
    resetForm();
    setFormData(prev => ({ ...prev, sort_order: categories.length }));
    setShowCreateDialog(true);
  };

  const handleEdit = (category: CategoryWithIcon) => {
    setSelectedCategory(category);
    setFormData({
      value: category.value,
      label: category.label,
      description: category.description || '',
      icon_name: category.icon_name,
      emoji: category.emoji,
      color: category.color,
      sort_order: category.sort_order,
      is_active: category.is_active,
      is_default: category.is_default,
    });
    setShowEditDialog(true);
  };

  const handleDelete = (category: CategoryWithIcon) => {
    setSelectedCategory(category);
    setShowDeleteDialog(true);
  };

  const submitCreate = async () => {
    if (!formData.label.trim() || !formData.value.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setWorking(true);
    try {
      await createCategory(formData);
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      // Error handled in context
    } finally {
      setWorking(false);
    }
  };

  const submitEdit = async () => {
    if (!selectedCategory || !formData.label.trim() || !formData.value.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setWorking(true);
    try {
      await updateCategory(selectedCategory.id, formData);
      setShowEditDialog(false);
      setSelectedCategory(null);
      resetForm();
    } catch (error) {
      // Error handled in context
    } finally {
      setWorking(false);
    }
  };

  const submitDelete = async () => {
    if (!selectedCategory) return;

    setWorking(true);
    try {
      await deleteCategory(selectedCategory.id);
      setShowDeleteDialog(false);
      setSelectedCategory(null);
    } catch (error) {
      // Error handled in context
    } finally {
      setWorking(false);
    }
  };

  // Generate URL-friendly value from label
  const generateValue = (label: string) => {
    return label.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading categories...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Tag className="w-5 h-5" />
            <span>Category Management</span>
            <div className={`w-2 h-2 rounded-full ml-auto ${isConnected ? 'bg-success' : 'bg-destructive'}`} />
          </CardTitle>
          <CardDescription>
            Manage video categories that users can select when creating content
            {isConnected ? ' • Real-time updates active' : ' • Connection offline'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {categories.length} total categories • {categories.filter(c => c.is_active).length} active
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={refreshCategories}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <div className="grid gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="transition-all duration-200 hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 flex-1">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{category.label}</h3>
                      {category.is_default && (
                        <Star className="w-4 h-4 text-yellow-500" />
                      )}
                      {!category.is_active && (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Value: {category.value}</span>
                      <span>•</span>
                      <span>Order: {category.sort_order}</span>
                      <span>•</span>
                      <span>{category.video_count} videos</span>
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(category)}
                    disabled={category.video_count > 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Category Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new video category for users to organize their content.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-label">Label *</Label>
              <Input
                id="create-label"
                value={formData.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    label,
                    value: generateValue(label)
                  }));
                }}
                placeholder="e.g., Wisdom"
              />
            </div>
            
            <div>
              <Label htmlFor="create-value">Value *</Label>
              <Input
                id="create-value"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder="e.g., wisdom"
              />
            </div>
            
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this category"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-emoji">Emoji</Label>
                <Input
                  id="create-emoji"
                  value={formData.emoji}
                  onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                  placeholder="📝"
                />
              </div>
              
              <div>
                <Label htmlFor="create-color">Color</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                          <span>{color}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="create-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="create-active">Active</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="create-default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                />
                <Label htmlFor="create-default">Default</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={working}>
              {working ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-label">Label *</Label>
              <Input
                id="edit-label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Wisdom"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-value">Value *</Label>
              <Input
                id="edit-value"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder="e.g., wisdom"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this category"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-emoji">Emoji</Label>
                <Input
                  id="edit-emoji"
                  value={formData.emoji}
                  onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                  placeholder="📝"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                          <span>{color}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                />
                <Label htmlFor="edit-default">Default</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={working}>
              {working ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Edit2 className="w-4 h-4 mr-2" />}
              Update Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span>Delete Category</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCategory?.label}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCategory?.video_count > 0 && (
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive">
                This category contains {selectedCategory.video_count} videos. Please move them to another category first.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={submitDelete} 
              disabled={working || (selectedCategory?.video_count || 0) > 0}
            >
              {working ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 