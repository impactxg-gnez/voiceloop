'use client';

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useSupabaseClient, useUser } from "@/supabase";
import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Users, MessageSquare, BarChart3, Heart, AlertCircle, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Form {
  id: string;
  title: string;
}

interface Response {
  id: string;
  form_id: string;
  question_text: string;
  response_text: string;
  parsed_fields: Record<string, any>;
  created_at: string;
}

interface Demographic {
  id: string;
  form_id: string;
  parsed_json: Record<string, any>;
  age: string | null;
  city: string | null;
  gender: string | null;
}

export default function InsightsPage() {
  const supabase = useSupabaseClient();
  const { user } = useUser();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);

  // Fetch user's forms
  const { data: forms, loading: formsLoading } = useCollection<Form>(
    'forms',
    'id, title',
    {},
    'created_at',
    'desc'
  );

  // Fetch responses for selected form
  const { data: responses, loading: responsesLoading } = useCollection<Response>(
    'form_responses',
    '*',
    selectedFormId ? { form_id: selectedFormId } : {},
    'created_at',
    'desc'
  );

  // Fetch demographics for selected form
  const { data: demographics, loading: demographicsLoading } = useCollection<Demographic>(
    'demographics',
    '*',
    selectedFormId ? { form_id: selectedFormId } : {},
    'created_at',
    'desc'
  );

  useEffect(() => {
    if (forms && forms.length > 0 && !selectedFormId) {
      setSelectedFormId(forms[0].id);
    }
  }, [forms, selectedFormId]);

  useEffect(() => {
    if (responses && responses.length > 0) {
      analyzeInsights();
    }
  }, [responses, demographics]);

  const analyzeInsights = () => {
    if (!responses || responses.length === 0) {
      setInsights(null);
      return;
    }

    setIsLoading(true);

    try {
      // Sentiment Analysis
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      responses.forEach(r => {
        const sentiment = r.parsed_fields?.sentiment;
        if (sentiment) {
          const s = String(sentiment).toLowerCase();
          if (s === 'positive') sentimentCounts.positive++;
          else if (s === 'negative') sentimentCounts.negative++;
          else sentimentCounts.neutral++;
        }
      });

      const totalSentiments = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative;
      const sentimentPercentages = totalSentiments > 0 ? {
        positive: Math.round((sentimentCounts.positive / totalSentiments) * 100),
        neutral: Math.round((sentimentCounts.neutral / totalSentiments) * 100),
        negative: Math.round((sentimentCounts.negative / totalSentiments) * 100),
      } : null;

      // Theme extraction (from parsed fields or text analysis)
      const themes: Record<string, number> = {};
      responses.forEach(r => {
        if (r.parsed_fields?.theme) {
          const theme = String(r.parsed_fields.theme);
          themes[theme] = (themes[theme] || 0) + 1;
        }
      });

      const topThemes = Object.entries(themes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([theme, count]) => ({ theme, count }));

      // Demographics Analysis
      const demographicInsights = demographics && demographics.length > 0 ? {
        total: demographics.length,
        byAge: {} as Record<string, number>,
        byGender: {} as Record<string, number>,
        byCity: {} as Record<string, number>,
      } : null;

      if (demographicInsights && demographics) {
        demographics.forEach(d => {
          if (d.age) {
            demographicInsights.byAge[d.age] = (demographicInsights.byAge[d.age] || 0) + 1;
          }
          if (d.gender) {
            demographicInsights.byGender[d.gender] = (demographicInsights.byGender[d.gender] || 0) + 1;
          }
          if (d.city) {
            demographicInsights.byCity[d.city] = (demographicInsights.byCity[d.city] || 0) + 1;
          }
        });
      }

      // Response patterns
      const questionResponseCounts: Record<string, number> = {};
      responses.forEach(r => {
        questionResponseCounts[r.question_text] = (questionResponseCounts[r.question_text] || 0) + 1;
      });

      const topQuestions = Object.entries(questionResponseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([question, count]) => ({ question, count }));

      // Common keywords (simple extraction)
      const allWords: Record<string, number> = {};
      const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'from']);
      
      responses.forEach(r => {
        const words = r.response_text.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w));
        words.forEach(word => {
          allWords[word] = (allWords[word] || 0) + 1;
        });
      });

      const topKeywords = Object.entries(allWords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

      setInsights({
        totalResponses: responses.length,
        sentimentCounts,
        sentimentPercentages,
        topThemes,
        demographicInsights,
        topQuestions,
        topKeywords,
      });
    } catch (error) {
      console.error('Error analyzing insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (formsLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center p-6 border-b bg-card">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold">Insights</h1>
          </div>
        </header>
        <main className="p-6 flex-1 overflow-auto flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    );
  }

  if (!forms || forms.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center p-6 border-b bg-card">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold">Insights</h1>
          </div>
        </header>
        <main className="p-6 flex-1 overflow-auto">
          <div className="border rounded-lg p-12 text-center">
            <h2 className="text-xl font-semibold">No forms yet</h2>
            <p className="text-muted-foreground mt-2">Create a form and collect responses to see insights.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-6 border-b bg-card">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Insights</h1>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedFormId || ''} onValueChange={setSelectedFormId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a form" />
            </SelectTrigger>
            <SelectContent>
              {forms.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  {form.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>
      <main className="p-6 flex-1 overflow-auto">
        {responsesLoading || demographicsLoading || isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Analyzing insights...</span>
          </div>
        ) : !responses || responses.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No responses yet</h2>
            <p className="text-muted-foreground mt-2">Collect responses to see insights for this form.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Total Responses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{insights?.totalResponses || 0}</div>
                </CardContent>
              </Card>
              
              {insights?.sentimentPercentages && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Heart className="h-4 w-4 text-green-600" />
                        Positive
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{insights.sentimentPercentages.positive}%</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        Neutral
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{insights.sentimentPercentages.neutral}%</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        Negative
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{insights.sentimentPercentages.negative}%</div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Sentiment Breakdown */}
            {insights?.sentimentCounts && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Sentiment Analysis
                  </CardTitle>
                  <CardDescription>Overall feedback sentiment distribution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-600" />
                        Positive
                      </span>
                      <span className="font-medium">{insights.sentimentCounts.positive} responses</span>
                    </div>
                    {insights.sentimentPercentages && (
                      <Progress value={insights.sentimentPercentages.positive} className="bg-gray-200" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-600" />
                        Neutral
                      </span>
                      <span className="font-medium">{insights.sentimentCounts.neutral} responses</span>
                    </div>
                    {insights.sentimentPercentages && (
                      <Progress value={insights.sentimentPercentages.neutral} className="bg-gray-200" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-600" />
                        Negative
                      </span>
                      <span className="font-medium">{insights.sentimentCounts.negative} responses</span>
                    </div>
                    {insights.sentimentPercentages && (
                      <Progress value={insights.sentimentPercentages.negative} className="bg-gray-200" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Keywords */}
              {insights?.topKeywords && insights.topKeywords.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Top Keywords
                    </CardTitle>
                    <CardDescription>Most frequently mentioned words</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {insights.topKeywords.map(({ word, count }: any) => (
                        <Badge key={word} variant="secondary" className="text-sm">
                          {word} ({count})
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Demographics */}
              {insights?.demographicInsights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Demographics
                    </CardTitle>
                    <CardDescription>Respondent demographics breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.keys(insights.demographicInsights.byGender).length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">By Gender</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(insights.demographicInsights.byGender).map(([gender, count]: any) => (
                              <Badge key={gender} variant="outline">
                                {gender}: {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {Object.keys(insights.demographicInsights.byAge).length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">By Age</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(insights.demographicInsights.byAge).map(([age, count]: any) => (
                              <Badge key={age} variant="outline">
                                {age}: {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {Object.keys(insights.demographicInsights.byCity).length > 0 && (
                        <div>
                          <div className="text-sm font-medium mb-2">By City</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(insights.demographicInsights.byCity).slice(0, 5).map(([city, count]: any) => (
                              <Badge key={city} variant="outline">
                                {city}: {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Top Questions */}
            {insights?.topQuestions && insights.topQuestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Most Answered Questions</CardTitle>
                  <CardDescription>Questions with the most responses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.topQuestions.map(({ question, count }: any, idx: number) => (
                      <div key={idx} className="flex items-start justify-between gap-4 pb-3 border-b last:border-0">
                        <p className="text-sm flex-1">{question}</p>
                        <Badge variant="secondary">{count} responses</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
