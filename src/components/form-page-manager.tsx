'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit3, ArrowUp, ArrowDown } from 'lucide-react';
import { useSupabaseClient } from '@/supabase';
import { useToast } from '@/hooks/use-toast';

interface FormPage {
  id?: string;
  title: string;
  content: string;
  desktop_image_url?: string;
  mobile_image_url?: string;
  desktop_image_file?: File | null;
  mobile_image_file?: File | null;
  page_order: number;
  is_intro_page: boolean;
}

interface FormPageManagerProps {
  formId: string;
  pages: FormPage[];
  onPagesChange: (pages: FormPage[]) => void;
}

export function FormPageManager({ formId, pages, onPagesChange }: FormPageManagerProps) {
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [newPage, setNewPage] = useState<FormPage>({
    title: '',
    content: '',
    desktop_image_file: null,
    mobile_image_file: null,
    page_order: pages.length,
    is_intro_page: false
  });
  const supabase = useSupabaseClient();
  const { toast } = useToast();

  const uploadImageIfAny = async (file: File | null | undefined, formId: string, pageId: string, kind: 'desktop' | 'mobile') => {
    if (!file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${formId}/pages/${pageId}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('form-assets').upload(path, file, { upsert: true, cacheControl: '3600' });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from('form-assets').getPublicUrl(path);
    return pub.publicUrl || null;
  };

  const addPage = async () => {
    if (!newPage.title.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a page title.",
      });
      return;
    }

    // Local-only mode when formId is empty (during form create)
    if (!formId) {
      const localId = `tmp_${Date.now()}`;
      const updatedPages = [...pages, { ...newPage, id: localId }];
      onPagesChange(updatedPages);
      setNewPage({ title: '', content: '', desktop_image_file: null, mobile_image_file: null, page_order: updatedPages.length, is_intro_page: false });
      toast({ title: 'Page added', description: 'This page will be saved when you publish.' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('form_pages')
        .insert({
          form_id: formId,
          title: newPage.title,
          content: newPage.content,
          page_order: newPage.page_order,
          is_intro_page: newPage.is_intro_page
        })
        .select()
        .single();

      if (error) throw error;

      // If images selected, upload and update row
      let desktopUrl: string | null = null;
      let mobileUrl: string | null = null;
      try {
        desktopUrl = await uploadImageIfAny(newPage.desktop_image_file, formId, data.id, 'desktop');
        mobileUrl = await uploadImageIfAny(newPage.mobile_image_file, formId, data.id, 'mobile');
      } catch (e) {
        console.error('Image upload error:', e);
      }
      if (desktopUrl || mobileUrl) {
        await supabase.from('form_pages').update({ desktop_image_url: desktopUrl || undefined, mobile_image_url: mobileUrl || undefined }).eq('id', data.id);
      }

      const updatedPages = [...pages, { ...data, id: data.id, desktop_image_url: desktopUrl || data.desktop_image_url, mobile_image_url: mobileUrl || data.mobile_image_url }];
      onPagesChange(updatedPages);
      
      setNewPage({
        title: '',
        content: '',
        desktop_image_file: null,
        mobile_image_file: null,
        page_order: updatedPages.length,
        is_intro_page: false
      });

      toast({
        title: "Success",
        description: "Page added successfully.",
      });
    } catch (error) {
      console.error('Error adding page:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add page. Please try again.",
      });
    }
  };

  const updatePage = async (pageId: string, updates: Partial<FormPage>) => {
    try {
      if (!formId) {
        // Local update
        const updatedPagesLocal = pages.map(p => (p.id === pageId ? { ...p, ...updates } : p));
        onPagesChange(updatedPagesLocal);
        return;
      }
      const toUpdate: any = { ...updates };
      // Handle image file uploads on update
      if (updates.desktop_image_file) {
        const url = await uploadImageIfAny(updates.desktop_image_file, formId, pageId, 'desktop');
        if (url) toUpdate.desktop_image_url = url;
        delete toUpdate.desktop_image_file;
      }
      if (updates.mobile_image_file) {
        const url = await uploadImageIfAny(updates.mobile_image_file, formId, pageId, 'mobile');
        if (url) toUpdate.mobile_image_url = url;
        delete toUpdate.mobile_image_file;
      }

      const { error } = await supabase
        .from('form_pages')
        .update(toUpdate)
        .eq('id', pageId);

      if (error) throw error;

      const updatedPages = pages.map(page => 
        page.id === pageId ? { ...page, ...updates } : page
      );
      onPagesChange(updatedPages);

      toast({
        title: "Success",
        description: "Page updated successfully.",
      });
    } catch (error) {
      console.error('Error updating page:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update page. Please try again.",
      });
    }
  };

  const deletePage = async (pageId: string) => {
    try {
      if (!formId) {
        const updatedPages = pages.filter(p => p.id !== pageId);
        onPagesChange(updatedPages);
        return;
      }
      const { error } = await supabase
        .from('form_pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      const updatedPages = pages.filter(page => page.id !== pageId);
      onPagesChange(updatedPages);

      toast({
        title: "Success",
        description: "Page deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting page:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete page. Please try again.",
      });
    }
  };

  const movePage = async (pageId: string, direction: 'up' | 'down') => {
    const pageIndex = pages.findIndex(page => page.id === pageId);
    if (pageIndex === -1) return;

    const newIndex = direction === 'up' ? pageIndex - 1 : pageIndex + 1;
    if (newIndex < 0 || newIndex >= pages.length) return;

    const updatedPages = [...pages];
    const [movedPage] = updatedPages.splice(pageIndex, 1);
    updatedPages.splice(newIndex, 0, movedPage);

    // Update page orders
    const reorderedPages = updatedPages.map((page, index) => ({
      ...page,
      page_order: index
    }));

    onPagesChange(reorderedPages);

    // Update in database if formId exists
    if (formId) {
      try {
        await Promise.all(
          reorderedPages.map(page => 
            supabase
              .from('form_pages')
              .update({ page_order: page.page_order })
              .eq('id', page.id)
          )
        );
      } catch (error) {
        console.error('Error updating page order:', error);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Pages</CardTitle>
        <CardDescription>
          Add introduction pages and organize your form content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Pages */}
        {pages.map((page, index) => (
          <div key={page.id || index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline">Page {index + 1}</Badge>
                {page.is_intro_page && (
                  <Badge variant="secondary">Introduction</Badge>
                )}
                <h3 className="font-medium">{page.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => movePage(page.id!, 'up')}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => movePage(page.id!, 'down')}
                  disabled={index === pages.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingPage(page.id!)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deletePage(page.id!)}
                  disabled={page.is_intro_page}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {page.content && (
              <div className="text-sm text-muted-foreground mb-3">
                {page.content.length > 100 
                  ? `${page.content.substring(0, 100)}...` 
                  : page.content
                }
              </div>
            )}

            {editingPage === page.id && (
              <div className="space-y-3 pt-3 border-t">
                <div>
                  <Label htmlFor={`title-${page.id}`}>Page Title</Label>
                  <Input
                    id={`title-${page.id}`}
                    value={page.title}
                    onChange={(e) => updatePage(page.id!, { title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`content-${page.id}`}>Page Content</Label>
                  <Textarea
                    id={`content-${page.id}`}
                    value={page.content}
                    onChange={(e) => updatePage(page.id!, { content: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor={`desktop-image-${page.id}`}>Desktop Fullscreen Image</Label>
                  <Input id={`desktop-image-${page.id}`} type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    updatePage(page.id!, { desktop_image_file: file || undefined });
                  }} />
                  {page.desktop_image_url && (
                    <div className="text-xs text-muted-foreground truncate">{page.desktop_image_url}</div>
                  )}
                </div>
                <div>
                  <Label htmlFor={`mobile-image-${page.id}`}>Mobile Fullscreen Image</Label>
                  <Input id={`mobile-image-${page.id}`} type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    updatePage(page.id!, { mobile_image_file: file || undefined });
                  }} />
                  {page.mobile_image_url && (
                    <div className="text-xs text-muted-foreground truncate">{page.mobile_image_url}</div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`intro-${page.id}`}
                    checked={page.is_intro_page}
                    onCheckedChange={(checked) => updatePage(page.id!, { is_intro_page: checked })}
                  />
                  <Label htmlFor={`intro-${page.id}`}>Introduction Page</Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPage(null)}
                >
                  Done Editing
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* Add New Page */}
        <div className="border-2 border-dashed rounded-lg p-4">
          <h3 className="font-medium mb-3">Add New Page</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-page-title">Page Title</Label>
              <Input
                id="new-page-title"
                placeholder="e.g., Welcome, Instructions, Thank You"
                value={newPage.title}
                onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="new-page-content">Page Content</Label>
              <Textarea
                id="new-page-content"
                placeholder="Enter the content for this page..."
                value={newPage.content}
                onChange={(e) => setNewPage({ ...newPage, content: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="new-page-desktop-image">Desktop Fullscreen Image</Label>
              <Input id="new-page-desktop-image" type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setNewPage({ ...newPage, desktop_image_file: file });
              }} />
            </div>
            <div>
              <Label htmlFor="new-page-mobile-image">Mobile Fullscreen Image</Label>
              <Input id="new-page-mobile-image" type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setNewPage({ ...newPage, mobile_image_file: file });
              }} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="new-page-intro"
                checked={newPage.is_intro_page}
                onCheckedChange={(checked) => setNewPage({ ...newPage, is_intro_page: checked })}
              />
              <Label htmlFor="new-page-intro">Introduction Page</Label>
            </div>
            <Button onClick={addPage} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Page
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
