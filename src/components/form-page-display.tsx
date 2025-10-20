'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface FormPage {
  id: string;
  title: string;
  content: string | null;
  desktop_image_url?: string | null;
  mobile_image_url?: string | null;
  page_order: number;
  is_intro_page: boolean;
}

interface FormPageDisplayProps {
  pages: FormPage[];
  onPageComplete: () => void;
  onPageBack: () => void;
  currentPageIndex: number;
}

export function FormPageDisplay({ 
  pages, 
  onPageComplete, 
  onPageBack, 
  currentPageIndex 
}: FormPageDisplayProps) {
  const currentPage = pages[currentPageIndex];

  if (!currentPage) {
    return null;
  }

  // Determine the image URL based on viewport (basic approach using CSS)
  const hasAnyImage = !!(currentPage.desktop_image_url || currentPage.mobile_image_url);
  const backgroundImage = `url(${currentPage.desktop_image_url || currentPage.mobile_image_url || ''})`;

  return (
    <div 
      className={`relative w-full min-h-[80vh] flex items-center justify-center ${hasAnyImage ? 'bg-cover bg-center' : ''}`}
      style={hasAnyImage ? { backgroundImage } : undefined}
    >
      {/* Mobile-specific overlay if separate mobile image provided */}
      {currentPage.mobile_image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center md:hidden"
          style={{ backgroundImage: `url(${currentPage.mobile_image_url})` }}
        />
      )}

      {/* Dark overlay for readability */}
      {hasAnyImage && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      <Card className="relative w-full max-w-2xl mx-auto bg-background/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{currentPage.title}</CardTitle>
          {currentPage.content && (
            <CardDescription className="text-base mt-4 whitespace-pre-wrap">
              {currentPage.content}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex justify-between items-center pt-6">
          <Button
            variant="outline"
            onClick={onPageBack}
            disabled={currentPageIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPageIndex + 1} of {pages.length}
            </span>
          </div>
          
          <Button onClick={onPageComplete}>
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
