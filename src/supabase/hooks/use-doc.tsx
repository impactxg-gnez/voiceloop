'use client';

import { useState, useEffect } from 'react';
import { PostgrestError } from '@supabase/supabase-js';
import { useSupabaseClient } from '../provider';

/** Utility type to add an 'id' field to a given type T. */
export type WithIdDoc<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithIdDoc<T> | null; // Document data with ID, or null.
  isLoading: boolean;     // True if loading.
  error: PostgrestError | Error | null; // Error object, or null.
}

/**
 * React hook to fetch a single document from Supabase.
 * Handles nullable table names and IDs.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {string | null | undefined} tableName - The Supabase table name.
 * @param {string | null | undefined} id - The document ID.
 * @param {string} [select] - Columns to select (default: '*')
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  tableName: string | null | undefined,
  id: string | null | undefined,
  select: string = '*'
): UseDocResult<T> {
  const [data, setData] = useState<WithIdDoc<T> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<PostgrestError | Error | null>(null);
  const supabase = useSupabaseClient();

  useEffect(() => {
    // If the table name or ID is not provided, reset state and do nothing.
    if (!tableName || !id) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    // Execute the query
    supabase
      .from(tableName)
      .select(select)
      .eq('id', id)
      .single()
      .then(({ data: result, error: queryError }: { data: any | null, error: any }) => {
        if (queryError) {
          setError(queryError);
          setData(null);
          setIsLoading(false);
          return;
        }

        if (result) {
          setData({
            ...result,
            id: result.id,
          });
        } else {
          setData(null);
        }
        setIsLoading(false);
        setError(null);
      });

    // Set up real-time subscription for this specific document
    const channel = supabase
      .channel(`${tableName}_${id}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('Real-time update for doc:', payload);
          // Refetch data when changes occur
          supabase
            .from(tableName)
            .select(select)
            .eq('id', id)
            .single()
            .then(({ data: result, error: queryError }: { data: any | null, error: any }) => {
              if (!queryError && result) {
                setData({
                  ...result,
                  id: result.id,
                });
              }
            });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount.
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, id, select, supabase]);

  return { data, isLoading, error };
}
