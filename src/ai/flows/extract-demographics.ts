// Heuristic demographics parser; runs on client or server

import { z } from 'zod';

export const demographicsSchema = z.object({
  age: z.number().int().min(0).max(120).nullable().optional(),
  city: z.string().min(1).max(120).nullable().optional(),
  gender: z.string().min(1).max(50).nullable().optional(),
}).strict();

export type Demographics = z.infer<typeof demographicsSchema>;

function simpleHeuristicParse(input: string): Demographics {
  const text = input.toLowerCase();

  // Age: first 1-3 digit number between 5 and 120
  let age: number | null = null;
  const ageMatch = text.match(/\b(1[01][0-9]|[5-9]?[0-9]|120)\b/);
  if (ageMatch) {
    const n = parseInt(ageMatch[0], 10);
    if (!isNaN(n) && n >= 5 && n <= 120) age = n;
  }

  // Gender keywords
  let gender: string | null = null;
  const genderMap: Record<string, string> = {
    male: 'male', man: 'male', boy: 'male', gentleman: 'male',
    female: 'female', woman: 'female', girl: 'female', lady: 'female',
    'non-binary': 'non-binary', nonbinary: 'non-binary', nb: 'non-binary',
    other: 'other', queer: 'other', trans: 'other'
  };
  for (const key of Object.keys(genderMap)) {
    if (text.includes(key)) { gender = genderMap[key]; break; }
  }

  // City: look for "in X" or "from X"; take up to comma/period
  let city: string | null = null;
  const cityMatch = input.match(/\b(?:in|from)\s+([A-Za-z][A-Za-z\s\-']{1,40})/i);
  if (cityMatch) {
    city = cityMatch[1].trim().replace(/[\.,]$/, '');
  }

  const result = { age, city, gender };
  const safe = demographicsSchema.partial().safeParse(result);
  return safe.success ? result : { age: null, city: null, gender: null };
}

export async function runExtractDemographics(text: string) {
  return simpleHeuristicParse(text);
}


