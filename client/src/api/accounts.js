import client from './client';

export const getAccounts = async () => {
  const { data } = await client.get('/api/accounts');
  return data;
};

export const getAccount = async (id) => {
  const { data } = await client.get(`/api/accounts/${id}`);
  return data;
};

export const createAccount = async (payload) => {
  const { data } = await client.post('/api/accounts', payload);
  return data;
};

export const createAccountWithOwner = async (payload) => {
  const { data } = await client.post('/api/accounts/with-owner', payload);
  return data;
};

export const updateAccount = async (id, payload) => {
  const { data } = await client.patch(`/api/accounts/${id}`, payload);
  return data;
};

export const updateMyAccount = async (payload) => {
  const { data } = await client.patch('/api/accounts/mine', payload);
  return data;
};

export const uploadLogo = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const { data } = await client.post('/api/accounts/logo', {
          base64,
          name: file.name,
          type: file.type,
        });
        resolve(data.url);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const deleteAccount = async (id) => {
  const { data } = await client.delete(`/api/accounts/${id}`);
  return data;
};

export const getDefaults = async () => {
  const { data } = await client.get('/api/defaults');
  return data;
};

export const updateDefaults = async (payload) => {
  const { data } = await client.patch('/api/defaults', payload);
  return data;
};
