# VoiceLoop - Firebase to Supabase Migration

This project has been successfully migrated from Firebase to Supabase. All Firebase dependencies have been removed and replaced with Supabase equivalents.

## Migration Summary

### What was changed:
- ✅ Replaced Firebase Auth with Supabase Auth
- ✅ Replaced Firestore with Supabase Database (PostgreSQL)
- ✅ Updated all React hooks and providers
- ✅ Migrated authentication flows (login, signup, OAuth)
- ✅ Updated database operations (CRUD operations)
- ✅ Removed all Firebase dependencies from package.json
- ✅ Deleted Firebase configuration files

### New Supabase Structure:
- **Authentication**: Supabase Auth with email/password and Google OAuth
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: Supabase real-time subscriptions
- **Storage**: Supabase Storage (for future audio file uploads)

## Setup Instructions

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key

### 2. Set up Environment Variables
Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up Database Schema
Run the SQL commands from `supabase-schema.sql` in your Supabase SQL editor to create the necessary tables and policies.

### 4. Configure Authentication
In your Supabase dashboard:
1. Go to Authentication > Settings
2. Enable email/password authentication
3. Configure Google OAuth provider (if needed)
4. Set up redirect URLs for your domain

### 5. Install Dependencies
```bash
npm install
```

### 6. Run the Application
```bash
npm run dev
```

## Database Schema

The application uses three main tables:

### `forms`
- `id` (UUID, Primary Key)
- `title` (TEXT)
- `owner_uid` (UUID, Foreign Key to auth.users)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `question_count` (INTEGER)

### `questions`
- `id` (UUID, Primary Key)
- `form_id` (UUID, Foreign Key to forms)
- `text` (TEXT)
- `order` (INTEGER)
- `created_at` (TIMESTAMP)

### `submissions`
- `id` (UUID, Primary Key)
- `form_id` (UUID, Foreign Key to forms)
- `question_id` (UUID, Foreign Key to questions)
- `question_text` (TEXT)
- `audio_url` (TEXT)
- `transcription` (TEXT)
- `submitter_uid` (UUID, Foreign Key to auth.users)
- `created_at` (TIMESTAMP)

## Key Differences from Firebase

### Authentication
- **Before**: Firebase Auth with `signInWithEmailAndPassword()`
- **After**: Supabase Auth with `supabase.auth.signInWithPassword()`

### Database Operations
- **Before**: Firestore with `collection()`, `doc()`, `query()`
- **After**: Supabase with `supabase.from('table').select()`, `.insert()`, `.update()`

### Real-time Subscriptions
- **Before**: Firestore `onSnapshot()`
- **After**: Supabase real-time with `supabase.channel().on()`

### User Management
- **Before**: Firebase User object with `uid`, `email`, `displayName`
- **After**: Supabase User object with `id`, `email`, `user_metadata`

## Security

The application uses Row Level Security (RLS) policies to ensure:
- Users can only access their own forms
- Users can only see questions for their own forms
- Users can view submissions for their own forms
- Anyone can submit responses to forms

## AI Integration

The AI flows remain unchanged and continue to use:
- Google Genkit for AI orchestration
- Gemini 2.5 Flash for transcription and sentiment analysis
- Server Actions for AI processing

## Next Steps

1. **Audio Storage**: Consider implementing Supabase Storage for audio file uploads
2. **Real-time Updates**: Enhance real-time features using Supabase subscriptions
3. **Database Optimization**: Add more indexes and optimize queries as needed
4. **Error Handling**: Implement comprehensive error handling for Supabase operations

## Troubleshooting

### Common Issues:
1. **Authentication Errors**: Check your Supabase URL and anon key
2. **Database Errors**: Ensure RLS policies are properly configured
3. **CORS Issues**: Configure allowed origins in Supabase settings
4. **Real-time Issues**: Check if real-time is enabled in your Supabase project

### Support:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Supabase GitHub](https://github.com/supabase/supabase)
