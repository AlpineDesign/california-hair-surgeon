import client from './client';

export const login = async (username, password) => {
  const { data } = await client.post('/api/auth/login', { username, password });
  return data;
};

export const signup = async ({ username, password, firstName, lastName, email }) => {
  const { data } = await client.post('/api/auth/signup', { username, password, firstName, lastName, email });
  return data;
};

export const resetPassword = async (email) => {
  const { data } = await client.post('/api/auth/reset-password', { email });
  return data;
};
