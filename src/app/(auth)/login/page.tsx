'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { useAuth, useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { FirebaseError } from "firebase/app";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithRedirect, getRedirectResult } from "firebase/auth";

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(true);
  
  useEffect(() => {
    // This effect will run when the user state is definitively known.
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (auth) {
      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            // This means the user has just been redirected from Google.
            // The onAuthStateChanged listener will handle the user state update,
            // and the effect above will trigger the redirect to the dashboard.
            // No need to manually push here.
          }
        })
        .catch((error) => {
          console.error("Google redirect sign in error", error);
          toast({
            variant: "destructive",
            title: "Google Sign In Failed",
            description: "Could not complete sign in with Google.",
          });
        })
        .finally(() => {
            // We can now show the page content as the redirect check is complete.
            setIsSigningIn(false);
        });
    } else {
        // If auth is not ready, we are still 'signing in' from the page's perspective
        setIsSigningIn(false);
    }
  }, [auth, router, toast]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The onAuthStateChanged listener will pick this up and the useEffect will redirect.
    } catch (error) {
      console.error("Sign in error", error);
      if (error instanceof FirebaseError) {
        toast({
          variant: "destructive",
          title: "Sign In Failed",
          description: error.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Sign In Failed",
          description: "An unexpected error occurred.",
        });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Set the loading state right before redirecting
      setIsSigningIn(true);
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Google sign in error", error);
      if (error instanceof FirebaseError) {
        toast({
          variant: "destructive",
          title: "Google Sign In Failed",
          description: error.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Google Sign In Failed",
          description: "An unexpected error occurred.",
        });
      }
      setIsSigningIn(false);
    }
  };

  // While checking for redirect result or if user is loading, show a loader.
  // Don't show the page if the user is already logged in, as the redirect will happen.
  if (isUserLoading || isSigningIn || user) {
    return <div>Loading...</div>; 
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
          <Logo className="w-12 h-12 mx-auto text-primary" />
          <CardTitle className="text-2xl mt-4">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to manage your feedback forms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button className="w-full" type="submit">Sign in</Button>
          </form>

          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4" onClick={handleGoogleSignIn}>
            Sign in with Google
          </Button>
           <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline text-primary">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
