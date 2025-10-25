# AI Form Builder Setup Guide

## Issue
The AI Form Builder was showing mock suggestions because the AI service was not properly configured.

## Fix Applied
✅ Replaced the mock AI service with actual Google AI (Gemini) integration
✅ Installed `@google/generative-ai` package
✅ Updated environment configuration

## Setup Instructions

### 1. Get Your Google AI API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 2. Configure Environment Variables

Create a `.env.local` file in the `voiceloop` directory (if it doesn't exist) with:

```env
GOOGLE_AI_API_KEY=your-actual-api-key-here
```

**Alternative variable names (any of these will work):**
- `GOOGLE_AI_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`

### 3. Restart Your Development Server

```bash
npm run dev
```

### 4. Test the AI Form Builder

1. Navigate to the form creation page
2. Click "Enable AI" in the AI Form Builder card
3. Enter a description like: "Create a hotel feedback form with questions about cleanliness, service, and amenities"
4. Click "Generate Question Suggestions"
5. You should now see real AI-generated suggestions instead of mock responses!

## How It Works

The AI Form Builder now:
- Uses Google's Gemini AI models (specifically `gemini-1.5-flash`)
- Generates contextual questions based on your description
- Supports voice input for descriptions
- Falls back gracefully if the API key is not configured

## Troubleshooting

### Still seeing mock responses?
1. Check that your `.env.local` file is in the correct location (`voiceloop/.env.local`)
2. Verify the API key is correct (no extra spaces or quotes)
3. Restart the development server completely
4. Check the browser console and terminal for error messages

### API Key Issues?
- Make sure you've enabled the Generative Language API in Google Cloud Console
- Check that your API key has the necessary permissions
- Verify you haven't exceeded any rate limits

### Fallback Behavior
If the AI service fails for any reason, the system will automatically provide:
- Context-aware fallback suggestions based on keywords in your description
- Generic questions if no specific context is detected

## Free Tier Limits

Google AI (Gemini) offers a generous free tier:
- **Gemini 1.5 Flash**: 15 requests per minute
- **Gemini 1.5 Pro**: 2 requests per minute
- Perfect for development and moderate production use

## Need Help?

Check the console logs for detailed error messages. The API route logs:
- Available API keys
- Model attempts
- Response parsing
- Error details



