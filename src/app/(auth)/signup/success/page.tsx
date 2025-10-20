'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Account Created Successfully!</CardTitle>
          <CardDescription>
            Welcome to VoiseForm! Your account has been created.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Mail className="w-5 h-5 text-primary" />
            <div className="text-sm">
              <p className="font-medium">Check Your Email</p>
              <p className="text-muted-foreground">
                We've sent you a verification link. Click it to activate your account.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/login">
                Go to Sign In
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard">
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Didn't receive the email?</p>
            <p>Check your spam folder or try signing in anyway.</p>
            <p className="mt-2 text-xs">
              Note: You can sign in immediately - email verification is optional.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
