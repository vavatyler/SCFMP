import apiClient from './client';

export const listFarmerGroups = async (params = {}) => {
  const { data } = await apiClient.get('/farmer-groups', { params });
  return data.data;
};

export const createFarmerGroup = async (payload) => {
  const { data } = await apiClient.post('/farmer-groups', payload);
  return data.data;
};

export const updateFarmerGroup = async (id, payload) => {
  const { data } = await apiClient.put(`/farmer-groups/${id}`, payload);
  return data.data;
};

export const deleteFarmerGroup = async (id) => {
  await apiClient.delete(`/farmer-groups/${id}`);
};
