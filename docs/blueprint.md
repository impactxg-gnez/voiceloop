# **App Name**: Vocalize Feedback

## Core Features:

- Form Builder: Makers can create forms with various question types (voice, text, MCQ, rating, etc.), set validation rules, and customize branding.
- Form Runner: Respondents can fill out the form, record audio, or type text. Includes save and resume functionality via email link.
- Voice-to-Text Transcription: Transcribe voice responses using OpenAI's Whisper API to convert audio into text.
- Sentiment Analysis: Analyze the sentiment of the transcribed text using OpenAI's gpt-4o-mini tool to determine if the feedback is positive, negative, or neutral.
- Theme Extraction: Identify and cluster common themes from text and voice responses using text embeddings and clustering algorithms, providing insights into the main topics discussed.
- Insights Dashboard: Visualize feedback data through KPI tiles, time trends, sentiment distribution charts, and theme summaries.
- Google Sheets Integration: Sync form responses to Google Sheets, respecting anonymization settings defined by the maker.
- Firebase Integration: Integration with Firestore, Cloud Storage and Cloud Functions to handle data storage, audio file management, and backend processing.

## Style Guidelines:

- Primary color: HSL(210, 67%, 55%) - A vibrant blue (#3498db) for trust and clarity.
- Background color: HSL(210, 20%, 20%) - A dark gray (#333f48) for a modern look.
- Accent color: HSL(180, 50%, 50%) - A bright cyan (#46b6ac) to draw attention to important UI elements.
- Body and headline font: 'Inter', a grotesque-style sans-serif font for a modern, neutral look, suitable for both headlines and body text.
- Use consistent and clear icons to represent different question types and actions within the platform.
- Implement a mobile-first, responsive layout with a clean and intuitive design.
- Incorporate subtle animations for transitions and loading states to enhance user experience.