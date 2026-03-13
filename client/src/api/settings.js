import client from './client';

export const getSettings = async () => {
  const { data } = await client.get('/api/settings');
  return data;
};

export const updateSettings = async (payload) => {
  const { data } = await client.patch('/api/settings', payload);
  return data;
};

export const getOptions = async () => {
  const { data } = await client.get('/api/settings/options');
  return data;
};

export const updateOptions = async (payload) => {
  const { data } = await client.patch('/api/settings/options', payload);
  return data;
};
