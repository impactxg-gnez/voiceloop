
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // Redirect if user is already logged in
    if (!isUserLoading && user) {
      router.push('/dashboard');
      return;
    }

    // If auth is ready and there's no user, check for redirect result
    if (!isUserLoading && !user && auth && firestore) {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result) {
            // User just signed up via Google redirect.
            const newUser = result.user;
            await setDoc(doc(firestore, "users", newUser.uid), {
              uid: newUser.uid,
              displayName: newUser.displayName,
              email: newUser.email,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
        })
        .catch((error) => {
          console.error("Google redirect sign up error", error);
          toast({
            variant: "destructive",
            title: "Google Sign Up Failed",
            description: "Could not complete sign up with Google.",
          });
        }).finally(() => {
            setIsProcessing(false);
        });
    } else if (!isUserLoading) {
        setIsProcessing(false);
    }
  }, [user, isUserLoading, auth, firestore, router, toast]);

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!firestore || !auth) return;
    setIsProcessing(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      await updateProfile(newUser, { displayName });

      // Create a user document in Firestore
      await setDoc(doc(firestore, "users", newUser.uid), {
        uid: newUser.uid,
        displayName,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Account Created!",
        description: "You have been successfully signed up.",
      });
      // onAuthStateChanged will handle the redirect
    } catch (error) {
      console.error("Sign up error", error);
      setIsProcessing(false);
      if (error instanceof FirebaseError) {
        toast({
          variant: "destructive",
          title: "Sign Up Failed",
          description: error.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Sign Up Failed",
          description: "An unexpected error occurred.",
        });
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    setIsProcessing(true);
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Google sign in error", error);
      setIsProcessing(false);
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
    }
  };
  
  if (isUserLoading || isProcessing) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // Only show the signup page if there's no user and we're not processing anything
  if (user) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
          <Logo className="w-12 h-12 mx-auto text-primary" />
          <CardTitle className="text-2xl mt-4">Create an Account</CardTitle>
          <CardDescription>
            Get started with Vocalize for free.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="grid gap-4">
             <div className="grid gap-2">
              <Label htmlFor="displayName">Name</Label>
              <Input id="displayName" type="text" placeholder="Your Name" required value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.g.et.value)} />
            </div>
            <Button className="w-full" type="submit">Create Account</Button>
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
            Sign up with Google
          </Button>

           <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline text-primary">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
