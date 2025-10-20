'use client';

import { useState, useEffect } from 'react';
import { PostgrestError, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useSupabaseClient } from '../provider';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: PostgrestError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a Supabase table in real-time.
 * Handles nullable table names.
 *
 * @template T Optional type for row data. Defaults to any.
 * @param {string | null | undefined} tableName - The Supabase table name.
 * @param {string} [select] - Columns to select (default: '*')
 * @param {object} [filters] - Additional filters to apply
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
  tableName: string | null | undefined,
  select: string = '*',
  filters?: Record<string, any>
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PostgrestError | Error | null>(null);
  const supabase = useSupabaseClient();

  useEffect(() => {
    // If the table name is not provided, reset state and do nothing.
    if (!tableName) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    // Execute the query
    let query = supabase.from(tableName).select(select);

    // Apply filters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Execute the query
    query.then(({ data: result, error: queryError }: { data: any[] | null, error: any }) => {
      if (queryError) {
        setError(queryError);
        setData(null);
        setIsLoading(false);
        return;
      }

      const docs = (result || []).map((row: any) => ({
        ...row,
        id: row.id,
      }));
      setData(docs);
      setIsLoading(false);
      setError(null);
    });

    // Set up real-time subscription
    const channel = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Real-time update:', payload);
          // Refetch data when changes occur
          query.then(({ data: result, error: queryError }: { data: any[] | null, error: any }) => {
            if (!queryError && result) {
              const docs = result.map((row: any) => ({
                ...row,
                id: row.id,
              }));
              setData(docs);
            }
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount.
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, select, JSON.stringify(filters), supabase]);

  return { data, isLoading, error };
}
