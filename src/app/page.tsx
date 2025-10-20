import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowRight, Bot, LayoutTemplate, Voicemail, Wand2, Sheet, BarChart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const features = [
  {
    icon: <LayoutTemplate className="w-8 h-8 text-primary" />,
    title: "Intuitive Form Builder",
    description: "Create beautiful, engaging forms with voice, text, multiple-choice, and rating questions.",
  },
  {
    icon: <Voicemail className="w-8 h-8 text-primary" />,
    title: "Seamless Voice Recording",
    description: "Respondents can easily record audio answers, providing richer, more nuanced feedback.",
  },
  {
    icon: <Wand2 className="w-8 h-8 text-primary" />,
    title: "AI-Powered Transcription",
    description: "Leverage OpenAI's Whisper for fast and accurate voice-to-text transcription.",
  },
  {
    icon: <Bot className="w-8 h-8 text-primary" />,
    title: "Advanced Sentiment Analysis",
    description: "Automatically analyze sentiment to gauge the tone of every piece of feedback.",
  },
  {
    icon: <BarChart className="w-8 h-8 text-primary" />,
    title: "Insightful Dashboards",
    description: "Visualize data with charts, KPI tiles, and automatically extracted themes.",
  },
  {
    icon: <Sheet className="w-8 h-8 text-primary" />,
    title: "Google Sheets Sync",
    description: "Keep your data in sync with real-time Google Sheets integration.",
  },
];

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === "hero-image");
  const dashboardImage = PlaceHolderImages.find(p => p.id === "dashboard-mockup");

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <section className="pt-24 pb-12 md:pt-32 md:pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">
                  Turn Voices into <span className="text-primary">Actionable Insights</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  VoiseForm is the modern way to collect feedback. Build beautiful forms with voice recording capabilities, get AI-powered transcriptions, and uncover deep insights from your audience.
                </p>
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Get Started For Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
              <div>
                {heroImage && (
                  <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    width={600}
                    height={400}
                    className="rounded-xl shadow-2xl"
                    data-ai-hint={heroImage.imageHint}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-12 md:py-20 bg-secondary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features, Simply Delivered</h2>
              <p className="text-muted-foreground mb-12">
                Everything you need to capture, analyze, and act on feedback.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="bg-card">
                  <CardHeader>
                    {feature.icon}
                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-12 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground mb-12">
                Start collecting voice feedback in just three simple steps.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">1</div>
                <h3 className="text-xl font-semibold mb-2">Build Your Form</h3>
                <p className="text-muted-foreground">Use our drag-and-drop editor to create a form that perfectly fits your needs.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">2</div>
                <h3 className="text-xl font-semibold mb-2">Share & Collect</h3>
                <p className="text-muted-foreground">Share a link or embed the form on your website to start collecting text and voice responses.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">3</div>
                <h3 className="text-xl font-semibold mb-2">Analyze Insights</h3>
                <p className="text-muted-foreground">Watch as AI transcribes audio, analyzes sentiment, and surfaces key themes on your dashboard.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-20 bg-secondary">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Feedback, Visualized</h2>
                    <p className="text-muted-foreground mb-12">
                        Go beyond raw data. Our interactive dashboard helps you understand the story behind the feedback.
                    </p>
                </div>
                {dashboardImage && (
                  <Image
                    src={dashboardImage.imageUrl}
                    alt={dashboardImage.description}
                    width={1200}
                    height={800}
                    className="rounded-xl shadow-2xl mx-auto"
                    data-ai-hint={dashboardImage.imageHint}
                  />
                )}
            </div>
        </section>

        <section id="pricing" className="py-12 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-primary/10 rounded-xl p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Listen?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Start your journey towards better feedback and deeper customer understanding today.
              </p>
              <Button size="lg" asChild>
                <Link href="/signup">
                  Start a 14-Day Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
