import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-sentiment-of-transcriptions.ts';
import '@/ai/flows/extract-themes-from-responses.ts';
import '@/ai/flows/transcribe-voice-responses.ts';