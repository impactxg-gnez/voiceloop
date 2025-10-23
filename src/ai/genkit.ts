// Mock AI object since we're now using Whisper for transcription
// This is kept for backward compatibility with existing code
export const ai = {
  generateText: async (options: any) => {
    console.log('AI generateText called - using mock response since we switched to Whisper');
    return { text: 'Mock response - AI service replaced with Whisper' };
  }
};
