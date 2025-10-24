'use client';

import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

// Export types for better TypeScript support
export type Database = {
  public: {
    Tables: {
      forms: {
        Row: {
          id: string;
          title: string;
          owner_uid: string;
          created_at: string;
          updated_at: string;
          question_count: number;
          is_published: boolean;
        };
        Insert: {
          id?: string;
          title: string;
          owner_uid: string;
          created_at?: string;
          updated_at?: string;
          question_count: number;
          is_published?: boolean;
        };
        Update: {
          id?: string;
          title?: string;
          owner_uid?: string;
          created_at?: string;
          updated_at?: string;
          question_count?: number;
          is_published?: boolean;
        };
      };
      form_pages: {
        Row: {
          id: string;
          form_id: string;
          title: string;
          content: string | null;
          desktop_image_url: string | null;
          mobile_image_url: string | null;
          page_order: number;
          is_intro_page: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          title: string;
          content?: string | null;
          desktop_image_url?: string | null;
          mobile_image_url?: string | null;
          page_order?: number;
          is_intro_page?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          form_id?: string;
          title?: string;
          content?: string | null;
          desktop_image_url?: string | null;
          mobile_image_url?: string | null;
          page_order?: number;
          is_intro_page?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          form_id: string;
          page_id: string | null;
          text: string;
          question_order: number;
        };
        Insert: {
          id?: string;
          form_id: string;
          page_id?: string | null;
          text: string;
          question_order: number;
        };
        Update: {
          id?: string;
          form_id?: string;
          page_id?: string | null;
          text?: string;
          question_order?: number;
        };
      };
      form_responses: {
        Row: {
          id: string;
          form_id: string;
          user_id: string | null;
          question_id: string | null;
          question_text: string;
          response_text: string;
          audio_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          user_id?: string | null;
          question_id?: string | null;
          question_text: string;
          response_text: string;
          audio_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          form_id?: string;
          user_id?: string | null;
          question_id?: string | null;
          question_text?: string;
          response_text?: string;
          audio_url?: string | null;
          created_at?: string;
        };
      };
      form_demographic_fields: {
        Row: {
          id: string;
          form_id: string;
          field_key: string;
          label: string;
          input_type: string; // 'text' | 'number' | 'select'
          required: boolean;
          options: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          field_key: string;
          label: string;
          input_type?: string;
          required?: boolean;
          options?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          form_id?: string;
          field_key?: string;
          label?: string;
          input_type?: string;
          required?: boolean;
          options?: any | null;
          created_at?: string;
        };
      };
    };
  };
};

// Export all hooks and providers
export * from './provider';
export * from './hooks/use-collection';
export * from './hooks/use-doc';
export * from './config';
