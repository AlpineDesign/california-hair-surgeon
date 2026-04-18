import client from './client';

export const getSurgeries = async (params = {}) => {
  const { data } = await client.get('/api/surgeries', { params });
  return data;
};

export const getSurgeriesByPatient = async (patientId) => {
  const { data } = await client.get('/api/surgeries', { params: { patientId } });
  return data;
};

export const getSurgery = async (id, params = {}) => {
  const { data } = await client.get(`/api/surgeries/${id}`, { params });
  return data;
};

export const createSurgery = async (payload) => {
  const { data } = await client.post('/api/surgeries', payload);
  return data;
};

export const updateSurgery = async (id, payload) => {
  const { data } = await client.patch(`/api/surgeries/${id}`, payload);
  return data;
};

export const deleteSurgery = async (id) => {
  const { data } = await client.delete(`/api/surgeries/${id}`);
  return data;
};

export const updateExtraction = async (id, payload) => {
  const { data } = await client.post(`/api/surgeries/${id}/extraction`, payload);
  return data;
};

export const updatePlacement = async (id, payload) => {
  const { data } = await client.post(`/api/surgeries/${id}/placement`, payload);
  return data;
};

// Activity Log — one record per button click; technicians see own, doctor sees all
export const getActivities = async (surgeryId) => {
  const { data } = await client.get(`/api/surgeries/${surgeryId}/activities`);
  return data;
};

export const createActivity = async (surgeryId, { action, payload }) => {
  const { data } = await client.post(`/api/surgeries/${surgeryId}/activities`, { action, payload });
  return data;
};

export const updateActivity = async (surgeryId, activityId, payload) => {
  const { data } = await client.patch(`/api/surgeries/${surgeryId}/activities/${activityId}`, { payload });
  return data;
};

export const deleteActivity = async (surgeryId, activityId) => {
  const { data } = await client.delete(`/api/surgeries/${surgeryId}/activities/${activityId}`);
  return data;
};
