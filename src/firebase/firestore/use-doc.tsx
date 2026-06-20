'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const path = (memoizedDocRef as any).path || '';
    
    // Intercept config/app requests to mock config instantly
    if (path === 'config/app' || path.startsWith('config/')) {
      setData({ id: 'app', adminUid: 'ali-uid' } as any);
      setIsLoading(false);
      setError(null);
      return;
    }

    const parts = path.split('/');
    if (parts.length < 2) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const tableName = parts[parts.length - 2];
    const docId = parts[parts.length - 1];

    if (!tableName || !docId) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    let active = true;

    const fetchDoc = async () => {
      try {
        const res = await fetch(`/api/db?table=${tableName}&id=${docId}`);
        if (res.status === 404) {
          if (active) {
            setData(null);
            setError(null);
          }
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch doc ${docId} from ${tableName}: ${res.statusText}`);
        }
        const jsonData = await res.json();
        if (active) {
          setData(jsonData);
          setError(null);
        }
      } catch (e: any) {
        if (active) {
          console.error(`Error fetching doc ${docId} on table ${tableName}:`, e);
          setError(e);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchDoc();

    // Listen to local changes
    const { dbEmitter } = require('../database-emitter');
    const handleDBChange = (event: { table: string }) => {
      if (event.table.toLowerCase() === tableName.toLowerCase()) {
        fetchDoc();
      }
    };
    dbEmitter.on(handleDBChange);

    // Poll every 10 seconds for concurrent changes
    const interval = setInterval(fetchDoc, 10000);

    return () => {
      active = false;
      dbEmitter.off(handleDBChange);
      clearInterval(interval);
    };
  }, [memoizedDocRef]);

  return { data, isLoading, error };
}