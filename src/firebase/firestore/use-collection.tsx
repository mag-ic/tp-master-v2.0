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

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let path = '';
    if ((memoizedTargetRefOrQuery as any).path) {
      path = (memoizedTargetRefOrQuery as any).path;
    } else if ((memoizedTargetRefOrQuery as any)._query?.path?.canonicalString) {
      path = (memoizedTargetRefOrQuery as any)._query.path.canonicalString();
    } else if (typeof memoizedTargetRefOrQuery === 'object') {
      // Fallback path extraction
      path = (memoizedTargetRefOrQuery as any).toString() || '';
    }

    const parts = path.split('/');
    const tableName = parts[parts.length - 1];

    if (!tableName) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    let active = true;

    const fetchCollection = async () => {
      try {
        const res = await fetch(`/api/db?table=${tableName}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch ${tableName}: ${res.statusText}`);
        }
        const jsonData = await res.json();
        if (active) {
          setData(jsonData);
          setError(null);
        }
      } catch (e: any) {
        if (active) {
          console.error(`Error fetching collection ${tableName}:`, e);
          setError(e);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchCollection();

    // Listen to local database changes
    const { dbEmitter } = require('../database-emitter');
    const handleDBChange = (event: { table: string }) => {
      if (event.table.toLowerCase() === tableName.toLowerCase()) {
        fetchCollection();
      }
    };
    dbEmitter.on(handleDBChange);

    // Poll every 10 seconds for concurrent mutations
    const interval = setInterval(fetchCollection, 10000);

    return () => {
      active = false;
      dbEmitter.off(handleDBChange);
      clearInterval(interval);
    };
  }, [memoizedTargetRefOrQuery]);

  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
  }
  return { data, isLoading, error };
}