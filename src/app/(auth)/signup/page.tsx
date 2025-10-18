
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithRedirect, getRedirectResult, User as FirebaseUser } from "firebase/auth";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const createUserDocument = async (newUser: FirebaseUser, name?: string | null) => {
    if (!firestore) return;
    await setDoc(doc(firestore, "users", newUser.uid), {
      uid: newUser.uid,
      displayName: name || newUser.displayName,
      email: newUser.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  useEffect(() => {
    // If we have a user, redirect to dashboard.
    if (!isUserLoading && user) {
      router.push('/dashboard');
      return;
    }
    
    if (auth && !user) {
      getRedirectResult(auth)
        .then(async (result) => {
          if (result) {
            // User just signed up/in via Google redirect.
            await createUserDocument(result.user);
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
            setIsLoading(false);
        });
    } else if (!isUserLoading) {
        setIsLoading(false);
    }
  }, [user, isUserLoading, auth, firestore, router, toast]);

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsProcessing(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      await updateProfile(newUser, { displayName });
      await createUserDocument(newUser, displayName);

      toast({
        title: "Account Created!",
        description: "You have been successfully signed up.",
      });
      // onAuthStateChanged in useUser hook will handle redirect via useEffect above
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
    await signInWithRedirect(auth, provider);
  };
  
  if (isLoading || isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // If user exists after loading, the effect will redirect.
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
              <Input id="displayName" type="text" placeholder="Your Name" required value={displayName} onChange={e => setDisplayName(e.target.value)} disabled={isProcessing} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isProcessing} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} disabled={isProcessing}/>
            </div>
            <Button className="w-full" type="submit" disabled={isProcessing}>
               {isProcessing && !displayName ? null : <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
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
