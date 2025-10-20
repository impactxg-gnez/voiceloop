'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function AuthStatus() {
  const supabase = useSupabaseClient();
  const { user, isUserLoading, userError } = useUser();
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('user_overview').select('count').limit(1);
        if (error) {
          console.error('Supabase connection error:', error);
          setConnectionStatus('error');
        } else {
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.error('Connection test error:', err);
        setConnectionStatus('error');
      }
    };

    checkConnection();
  }, [supabase]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Authentication Status
        </CardTitle>
        <CardDescription>Check if authentication is working properly</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Supabase Connection:</span>
            <div className="flex items-center gap-2">
              {connectionStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
              {connectionStatus === 'connected' && <CheckCircle className="h-4 w-4 text-green-500" />}
              {connectionStatus === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
              <span className="text-sm capitalize">{connectionStatus}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">User Loading:</span>
            <div className="flex items-center gap-2">
              {isUserLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!isUserLoading && <CheckCircle className="h-4 w-4 text-green-500" />}
              <span className="text-sm">{isUserLoading ? 'Loading...' : 'Ready'}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">User Status:</span>
            <div className="flex items-center gap-2">
              {user ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-500" />}
              <span className="text-sm">{user ? 'Logged In' : 'Not Logged In'}</span>
            </div>
          </div>
          
          {user && (
            <div className="flex items-center justify-between">
              <span className="text-sm">User Email:</span>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          )}
          
          {userError && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Error:</span>
              <span className="text-sm text-red-500">{userError.message}</span>
            </div>
          )}
        </div>
        
        <div className="pt-4 border-t">
          <Button 
            onClick={() => window.location.href = '/login'} 
            className="w-full"
            variant="outline"
          >
            Go to Login Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
