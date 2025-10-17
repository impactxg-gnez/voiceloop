'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted query or BAD THINGS WILL HAPPEN.
 * Use useMemo or useMemoFirebase to memoize it.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {Query<DocumentData> | null | undefined} query -
 * The Firestore Query. The hook will not run if the query is null or undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
  query: Query<DocumentData> | null | undefined
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // If the query is not provided, reset state and do nothing.
    if (!query) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      query,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        const docs = querySnapshot.docs.map(doc => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        setData(docs);
        setIsLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        let path = 'unknown';
        if ('_query' in query && query._query.path) {
            path = query._query.path.toString();
        } else if ('path' in query) {
            path = (query as CollectionReference).path;
        }

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);
        
        // Throw the error to be caught by the global error boundary.
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    // Cleanup subscription on unmount.
    return () => unsubscribe();
  }, [query]); // Rerun effect if query changes.

  return { data, isLoading, error };
}
