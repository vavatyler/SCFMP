import apiClient from './client';

export const listCooperatives = async () => {
  const { data } = await apiClient.get('/cooperatives');
  return data.data;
};

export const getCooperative = async (id) => {
  const { data } = await apiClient.get(`/cooperatives/${id}`);
  return data.data;
};

export const createCooperative = async (payload) => {
  const { data } = await apiClient.post('/cooperatives', payload);
  return data.data;
};

export const updateCooperative = async (id, payload) => {
  const { data } = await apiClient.put(`/cooperatives/${id}`, payload);
  return data.data;
};

export const deleteCooperative = async (id) => {
  const { data } = await apiClient.delete(`/cooperatives/${id}`);
  return data;
};
