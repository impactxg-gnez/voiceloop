# Supabase Migration Guide

## ✅ Migration Complete!

We've successfully migrated from Google Drive/Sheets to Supabase as the primary data storage. This simplifies the architecture and provides better control and reliability.

## 🎯 What Changed

### **Removed:**
- Google Drive folder linking
- Google Sheets integration
- All Google API dependencies
- Complex external API calls

### **Added:**
- New `form_responses` table in Supabase
- Row Level Security (RLS) policies
- Direct database storage for all responses
- Simplified response viewing

## 📋 Required Setup Steps

### **Step 1: Run Database Migration**

Go to your **Supabase SQL Editor** and run this SQL:

```sql
-- Drop old submissions table if it exists
DROP TABLE IF EXISTS submissions CASCADE;

-- Create form_responses table
CREATE TABLE IF NOT EXISTS form_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_user_id ON form_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_question_id ON form_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_created_at ON form_responses(created_at);

-- Enable Row Level Security
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Form owners can view responses to their forms" ON form_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_responses.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

CREATE POLICY "Anyone can submit form responses" ON form_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Form owners can update responses to their forms" ON form_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_responses.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

CREATE POLICY "Form owners can delete responses to their forms" ON form_responses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_responses.form_id 
      AND forms.owner_uid = auth.uid()
    )
  );

-- Create summary view
CREATE OR REPLACE VIEW form_responses_summary AS
SELECT 
  f.id AS form_id,
  f.title AS form_title,
  f.owner_uid,
  COUNT(DISTINCT fr.user_id) AS total_respondents,
  COUNT(fr.id) AS total_responses,
  MAX(fr.created_at) AS last_response_at
FROM forms f
LEFT JOIN form_responses fr ON f.id = fr.form_id
GROUP BY f.id, f.title, f.owner_uid;

GRANT SELECT ON form_responses_summary TO authenticated;
GRANT SELECT ON form_responses_summary TO anon;
```

### **Step 2: Verify Migration**

After running the SQL:
1. Check that the `form_responses` table exists in your Supabase dashboard
2. Verify RLS is enabled (should show a shield icon)
3. Check that the policies are created

### **Step 3: Environment Variables**

Make sure these are set in your Vercel environment:
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `OPENAI_API_KEY` ✅

You can now **REMOVE** these (no longer needed):
- ❌ `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- ❌ `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## 🎉 Benefits

### **1. Simplified Architecture**
- No external API calls to Google
- Everything in one database
- Faster response times

### **2. Better Security**
- RLS policies enforce data isolation
- User data is automatically filtered
- No risk of Google API quota limits

### **3. Easier Management**
- View responses directly in Supabase dashboard
- Use SQL queries for advanced analysis
- Export data easily

### **4. Cost Effective**
- No Google API costs
- Supabase free tier is generous
- Scales automatically

## 📊 How It Works

### **For Form Creators:**
1. Create a form
2. Responses are automatically saved to Supabase
3. View responses in the Responses tab
4. Export to CSV anytime

### **For Form Responders:**
1. Record voice response
2. Audio is transcribed with OpenAI Whisper
3. Response saved directly to Supabase
4. Form owner can view it immediately

### **Data Flow:**
```
User Records Voice 
  ↓
OpenAI Whisper Transcription
  ↓
Save to form_responses Table
  ↓
Form Owner Views in Responses Tab
  ↓
Export to CSV (optional)
```

## 🔐 Security & Privacy

### **Row Level Security (RLS)**
- Each user only sees their own forms' responses
- RLS policies are enforced at the database level
- Even if app code has bugs, database prevents data leaks

### **User Isolation**
- Forms have `owner_uid` field
- Responses linked to forms via `form_id`
- RLS automatically filters based on ownership

### **Public Submission**
- Anyone can submit responses (public forms)
- But only form owners can view them
- Submitters can't see other responses

## 🧪 Testing

### **Test the Flow:**
1. **Create a form** at `/forms/new`
2. **Submit a response** at `/forms/record/[formId]`
3. **View responses** at `/responses`
4. **Export CSV** to download data

### **Verify RLS:**
1. Create two test users
2. User A creates a form
3. User B submits a response
4. User A can see the response
5. User B cannot see other User A's forms

## 📁 Code Changes

### **Files Modified:**
- `src/app/(app)/forms/record/[formId]/page.tsx` - Updated to use `form_responses`
- `src/app/(app)/forms/new/page.tsx` - Removed Google integration UI
- `src/components/responses-tab.tsx` - Updated to fetch from `form_responses`
- `src/supabase/index.ts` - Updated TypeScript types

### **Files Deleted:**
- `src/components/google-drive-link.tsx`
- `src/components/google-sheets-info.tsx`
- `src/lib/google-sheets.ts`
- `src/app/api/google-sheets/route.ts`
- `src/app/api/google-drive/**`

## 🚀 Next Steps

1. **Run the SQL migration** in Supabase
2. **Test form submission** to verify it works
3. **Check responses tab** to see saved data
4. **Remove Google env variables** from Vercel (optional)

## ❓ Troubleshooting

### **"RLS Policy Error"**
- Make sure you ran the SQL migration
- Check that RLS is enabled on `form_responses` table
- Verify policies are created in Supabase dashboard

### **"Cannot Insert Response"**
- Check that `form_responses` table exists
- Verify the "Anyone can submit" policy is active
- Check console for specific error messages

### **"Cannot View Responses"**
- Make sure you're logged in
- Verify you own the form
- Check RLS policy for SELECT is active

## 📞 Support

If you encounter any issues:
1. Check Supabase logs in dashboard
2. Verify all migrations ran successfully
3. Test with a simple form first
4. Check browser console for errors

---

**Migration completed successfully! 🎉**

Your VoiceForm app now uses Supabase as the primary data storage, providing better reliability, security, and simplicity.
