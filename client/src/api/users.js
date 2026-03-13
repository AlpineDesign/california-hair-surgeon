import client from './client';

export const getUsers = async (params = {}) => {
  const { data } = await client.get('/api/users', { params });
  return data;
};

// GET /team — list account members (any authenticated user, for surgery assignment etc.)
export const getTeamUsers = async (params = {}) => {
  const { data } = await client.get('/api/users/team', { params });
  return data;
};

export const getDoctors = async (params = {}) => {
  const data = await getUsers(params);
  return data.filter((u) => (u.roles || []).includes('doctor'));
};

export const getTechnicians = async (params = {}) => {
  const data = await getTeamUsers(params);
  return data.filter((u) => {
    const roles = u.roles || [];
    return roles.includes('technician') || roles.includes('user');
  });
};

export const createUser = async (payload) => {
  const { data } = await client.post('/api/users', payload);
  return data;
};

export const deleteUser = async (id) => {
  const { data } = await client.delete(`/api/users/${id}`);
  return data;
};

export const updateMe = async (payload) => {
  const { data } = await client.patch('/api/users/me', payload);
  return data;
};

export const updateUser = async (id, payload) => {
  const { data } = await client.patch(`/api/users/${id}`, payload);
  return data;
};
