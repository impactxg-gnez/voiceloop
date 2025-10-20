export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

// Validate configuration
if (typeof window !== 'undefined' && (!supabaseConfig.url || !supabaseConfig.anonKey)) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('Current values:', {
    url: supabaseConfig.url ? 'Set' : 'Missing',
    anonKey: supabaseConfig.anonKey ? 'Set' : 'Missing'
  });
}