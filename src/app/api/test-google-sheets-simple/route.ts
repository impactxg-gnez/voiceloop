import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Test Google Sheets Simple API called');
    
    const body = await request.json();
    console.log('Received data:', body);
    
    // Check if Google Sheets credentials are configured
    const hasCredentials = !!(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && 
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    );
    
    console.log('Google Sheets credentials check:', {
      hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      hasCredentials
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test Google Sheets API is working',
      receivedData: body,
      credentialsConfigured: hasCredentials,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Test Google Sheets Simple error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Test Google Sheets Simple API is running',
    timestamp: new Date().toISOString()
  });
}

