
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
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If we have a user, redirect to dashboard.
    if (!isUserLoading && user) {
      router.push('/dashboard');
      return;
    }

    // If auth is ready and user is not loaded yet, check for redirect result.
    if (auth && !user) {
      getRedirectResult(auth)
        .catch((error) => {
          console.error("Google redirect sign in error", error);
          toast({
            variant: "destructive",
            title: "Google Sign In Failed",
            description: "Could not complete sign in with Google.",
          });
        })
        .finally(() => {
          // Whether it succeeded or failed, the redirect check is done.
          // The onAuthStateChanged listener in useUser will handle the user state update.
          // We can now show the page.
          setIsLoading(false);
        });
    } else if (!isUserLoading) {
        // If user is not loading and we don't have an auth object, just show the page.
        setIsLoading(false);
    }
  }, [user, isUserLoading, auth, router, toast]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsProcessing(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged in useUser hook will trigger redirect via useEffect above
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
      setIsProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    setIsProcessing(true);
    // Use redirect which is more robust
    await signInWithRedirect(auth, provider);
  };

  // Show a loader while checking for redirect results or initial user state
  if (isLoading || isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // If user exists after loading, the effect will redirect. Render nothing here to avoid flicker.
  if (user) {
    return null;
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
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isProcessing}/>
            </div>
             <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={isProcessing}/>
            </div>
            <Button className="w-full" type="submit" disabled={isProcessing}>
              {isProcessing && !email ? null : <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
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
          <Button variant="outline" className="w-full mt-4" onClick={handleGoogleSignIn} disabled={isProcessing}>
             {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
