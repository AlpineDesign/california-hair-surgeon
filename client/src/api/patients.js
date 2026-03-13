import client from './client';

export const getPatients = async (params = {}) => {
  const { data } = await client.get('/api/patients', { params });
  return data;
};

export const getPatient = async (id) => {
  const { data } = await client.get(`/api/patients/${id}`);
  return data;
};

export const createPatient = async (payload) => {
  const { data } = await client.post('/api/patients', payload);
  return data;
};

export const updatePatient = async (id, payload) => {
  const { data } = await client.patch(`/api/patients/${id}`, payload);
  return data;
};

export const deletePatient = async (id) => {
  const { data } = await client.delete(`/api/patients/${id}`);
  return data;
};
