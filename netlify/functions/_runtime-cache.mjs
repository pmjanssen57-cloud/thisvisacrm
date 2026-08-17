import { getStore } from '@netlify/blobs';

export const CRM_REFERENCE_STORE = 'this-crm-reference-cache';
export const CHAT_RUNTIME_STORE = 'this-live-chat-runtime';

export async function readCacheJson(storeName, key, options = {}) {
  try {
    const store = getStore({ name: storeName, consistency: options.consistency || 'strong' });
    return await store.get(key, { type: 'json', consistency: options.consistency || 'strong' });
  } catch (error) {
    if (!options.silent) console.warn(`Cache read failed for ${storeName}/${key}`, error?.message || error);
    return null;
  }
}

export async function writeCacheJson(storeName, key, value, options = {}) {
  try {
    const store = getStore({ name: storeName, consistency: options.consistency || 'strong' });
    await store.set(key, JSON.stringify(value), {
      metadata: {
        contentType: 'application/json',
        updatedAt: new Date().toISOString(),
        ...(options.metadata || {}),
      },
    });
    return true;
  } catch (error) {
    if (!options.silent) console.warn(`Cache write failed for ${storeName}/${key}`, error?.message || error);
    return false;
  }
}

export async function deleteCacheKey(storeName, key, options = {}) {
  try {
    const store = getStore({ name: storeName, consistency: options.consistency || 'strong' });
    await store.delete(key);
    return true;
  } catch (error) {
    if (!options.silent) console.warn(`Cache delete failed for ${storeName}/${key}`, error?.message || error);
    return false;
  }
}
