import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({
        error: 'URL parameter is required',
        example: '/api/test-drive-url?url=https://drive.google.com/drive/folders/1ABC123'
      });
    }

    // Test the URL parsing
    const patterns = [
      /\/folders\/([a-zA-Z0-9-_]+)/,  // https://drive.google.com/drive/folders/1ABC...
      /id=([a-zA-Z0-9-_]+)/,          // https://drive.google.com/drive/folders/1ABC...?usp=sharing
      /\/folders\/([a-zA-Z0-9-_]+)\?/, // https://drive.google.com/drive/folders/1ABC...?usp=sharing
    ];
    
    const cleanUrl = url.trim().replace(/['"]+$/, '');
    let folderId = null;
    let matchedPattern = null;
    
    for (let i = 0; i < patterns.length; i++) {
      const match = cleanUrl.match(patterns[i]);
      if (match) {
        folderId = match[1];
        matchedPattern = i;
        break;
      }
    }
    
    return NextResponse.json({
      originalUrl: url,
      cleanedUrl: cleanUrl,
      folderId: folderId,
      matchedPattern: matchedPattern,
      isValid: !!folderId,
      patterns: patterns.map((p, i) => ({
        index: i,
        pattern: p.toString(),
        test: p.test(cleanUrl)
      }))
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

