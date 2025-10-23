# VoiseForm - Voice Form Builder

VoiseForm is a modern voice feedback collection platform that turns voices into actionable insights. Build beautiful forms with voice recording capabilities, get AI-powered transcriptions, and uncover deep insights from your audience.

## Features

- 🎤 **Voice Recording**: Record voice responses directly in the browser
- 🤖 **AI Transcription**: Automatic transcription using Google Gemini
- 📊 **Analytics Dashboard**: View and analyze your feedback data
- 🔐 **Authentication**: Secure user authentication with Supabase
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- ⚡ **Real-time Updates**: Live data synchronization across devices

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL + Auth)
- **AI**: Google Genkit with Gemini 2.5 Flash
- **Audio**: WebRTC MediaRecorder API

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your Supabase project and add environment variables
4. Run the development server: `npm run dev`
5. Open [http://localhost:9002](http://localhost:9002) in your browser

## Environment Variables

Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup

Run the SQL schema in your Supabase SQL Editor to set up the required tables and security policies.

## License

© 2024 VoiseForm Inc. All rights reserved.
