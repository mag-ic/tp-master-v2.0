import { errorEmitter } from '@/firebase/error-emitter';

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: any, data: any, options?: any) {
  const path = docRef.path || '';
  const parts = path.split('/');
  const tableName = parts[parts.length - 2];
  const docId = parts[parts.length - 1];

  if (!tableName || !docId) {
    console.error("Invalid docRef path for set:", path);
    return;
  }

  fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set', table: tableName, id: docId, data })
  }).then(res => {
    if (res.ok) {
      const { dbEmitter } = require('./database-emitter');
      dbEmitter.emit({ table: tableName });
    } else {
      console.error(`Failed to set document: ${res.statusText}`);
    }
  }).catch(err => {
    console.error("Network error on setDocument:", err);
  });
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: any, data: any) {
  const path = colRef.path || '';
  const parts = path.split('/');
  const tableName = parts[parts.length - 1];

  if (!tableName) {
    console.error("Invalid colRef path for add:", path);
    return Promise.reject(new Error("Invalid colRef path"));
  }

  const generatedId = `${tableName.substring(0, 3)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const extendedData = { ...data, id: generatedId };

  const promise = fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set', table: tableName, id: generatedId, data: extendedData })
  }).then(res => {
    if (res.ok) {
      const { dbEmitter } = require('./database-emitter');
      dbEmitter.emit({ table: tableName });
    } else {
      console.error(`Failed to add document: ${res.statusText}`);
    }
    return { id: generatedId } as any;
  }).catch(err => {
    console.error("Network error on addDocument:", err);
    return { id: generatedId } as any;
  });

  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function updateDocumentNonBlocking(docRef: any, data: any) {
  const path = docRef.path || '';
  const parts = path.split('/');
  const tableName = parts[parts.length - 2];
  const docId = parts[parts.length - 1];

  if (!tableName || !docId) {
    console.error("Invalid docRef path for update:", path);
    return;
  }

  fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', table: tableName, id: docId, data })
  }).then(res => {
    if (res.ok) {
      const { dbEmitter } = require('./database-emitter');
      dbEmitter.emit({ table: tableName });
    } else {
      console.error(`Failed to update document: ${res.statusText}`);
    }
  }).catch(err => {
    console.error("Network error on updateDocument:", err);
  });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: any) {
  const path = docRef.path || '';
  const parts = path.split('/');
  const tableName = parts[parts.length - 2];
  const docId = parts[parts.length - 1];

  if (!tableName || !docId) {
    console.error("Invalid docRef path for delete:", path);
    return;
  }

  fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', table: tableName, id: docId })
  }).then(res => {
    if (res.ok) {
      const { dbEmitter } = require('./database-emitter');
      dbEmitter.emit({ table: tableName });
    } else {
      console.error(`Failed to delete document: ${res.statusText}`);
    }
  }).catch(err => {
    console.error("Network error on deleteDocument:", err);
  });
}