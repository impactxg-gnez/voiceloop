'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabaseClient } from '@/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabaseClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (type === 'signup' && token) {
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          });

          if (error) {
            console.error('Email verification error:', error);
            setStatus('error');
            setMessage(error.message);
          } else {
            setStatus('success');
            setMessage('Your email has been verified successfully!');
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          }
        } catch (error) {
          console.error('Email verification error:', error);
          setStatus('error');
          setMessage('An unexpected error occurred during verification.');
        }
      } else {
        setStatus('error');
        setMessage('Invalid verification link.');
      }
    };

    verifyEmail();
  }, [searchParams, supabase, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <Logo className="w-12 h-12 mx-auto text-primary mb-4" />
          <CardTitle className="text-2xl">Email Verification</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Verifying your email...'}
            {status === 'success' && 'Verification Complete!'}
            {status === 'error' && 'Verification Failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            {status === 'loading' && <Loader2 className="w-16 h-16 animate-spin text-primary" />}
            {status === 'success' && <CheckCircle className="w-16 h-16 text-green-500" />}
            {status === 'error' && <XCircle className="w-16 h-16 text-red-500" />}
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          
          {status === 'success' && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Redirecting you to your dashboard...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/login">
                  Try Signing In
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <Logo className="w-12 h-12 mx-auto text-primary mb-4" />
            <CardTitle className="text-2xl">Email Verification</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
