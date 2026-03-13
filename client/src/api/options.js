import client from './client';

/**
 * Options are dropdown values (surgeons, tip styles, hair types, etc.) stored as entities.
 * Patient and Surgery reference them by ID for filtering and consistency.
 */
export const getOptions = async () => {
  const { data } = await client.get('/api/options');
  return data || {};
};

export const createOption = async (payload) => {
  const { data } = await client.post('/api/options', payload);
  return data;
};

export const updateOption = async (id, payload) => {
  const { data } = await client.patch(`/api/options/${id}`, payload);
  return data;
};

export const deleteOption = async (id) => {
  await client.delete(`/api/options/${id}`);
};

export const reorderOptions = async (type, ids) => {
  const { data } = await client.post('/api/options/reorder', { type, ids });
  return data;
};

export const migrateOptions = async () => {
  const { data } = await client.post('/api/options/migrate');
  return data;
};
