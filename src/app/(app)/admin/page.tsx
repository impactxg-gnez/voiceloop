'use client';

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, FileText, MessageSquare, Calendar, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AdminGuard } from '@/components/admin-guard';

interface UserProfile {
  id: string;
  email: string;
  user_created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Form {
  id: string;
  title: string;
  owner_uid: string;
  created_at: string;
  question_count: number;
}

interface Submission {
  id: string;
  form_id: string;
  question_text: string;
  transcription: string;
  submitter_uid: string | null;
  created_at: string;
}

export default function AdminPage() {
  const supabase = useSupabaseClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('user_overview')
        .select('*')
        .order('user_created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        setError('Failed to fetch users. You may not have permission to view this data.');
        return;
      }

      // Fetch forms
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (formsError) {
        console.error('Error fetching forms:', formsError);
      }

      // Fetch submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
      }

      setUsers(usersData || []);
      setForms(formsData || []);
      setSubmissions(submissionsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('An unexpected error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || user?.display_name || extractNameFromEmail(user?.email || '') || 'Unknown User';
  };

  const extractNameFromEmail = (email: string) => {
    const localPart = email.split('@')[0];
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  };

  const getUserEmail = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.email || 'Unknown';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading admin data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchAllData} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminGuard>
      <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, forms, and submissions</p>
        </div>
        <Button onClick={fetchAllData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="forms">
            <FileText className="h-4 w-4 mr-2" />
            Forms ({forms.length})
          </TabsTrigger>
          <TabsTrigger value="submissions">
            <MessageSquare className="h-4 w-4 mr-2" />
            Submissions ({submissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>All users who have signed up for VoiseForm</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || ''} />
                          <AvatarFallback>
                            {(user.full_name || user.display_name)?.[0] || user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.full_name || user.display_name || 'No name set'}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Joined {formatDistanceToNow(new Date(user.user_created_at), { addSuffix: true })}
                            </div>
                            {user.email_confirmed_at ? (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Unverified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {user.last_sign_in_at ? (
                            <span className="text-muted-foreground">
                              Last seen {formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Never signed in</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Forms</CardTitle>
              <CardDescription>Forms created by all users</CardDescription>
            </CardHeader>
            <CardContent>
              {forms.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No forms found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {forms.map((form) => (
                    <div key={form.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{form.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Created by {getUserName(form.owner_uid)} ({getUserEmail(form.owner_uid)})
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(form.created_at), { addSuffix: true })}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {form.question_count} question{form.question_count !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Submissions</CardTitle>
              <CardDescription>Voice responses submitted by users</CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No submissions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">Question: {submission.question_text}</p>
                          <p className="text-xs text-muted-foreground">
                            Submitted by {submission.submitter_uid ? getUserName(submission.submitter_uid) : 'Anonymous'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <p className="text-sm">{submission.transcription}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AdminGuard>
  );
}
