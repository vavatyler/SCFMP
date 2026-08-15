import apiClient from './client';

export const listProduction = async (params = {}) => {
  const { data } = await apiClient.get('/production', { params });
  return data;
};

export const createProduction = async (payload) => {
  const { data } = await apiClient.post('/production', payload);
  return data.data;
};

export const updateProduction = async (id, payload) => {
  const { data } = await apiClient.put(`/production/${id}`, payload);
  return data.data;
};

export const deleteProduction = async (id) => {
  await apiClient.delete(`/production/${id}`);
};

export const listProducts = async (params = {}) => {
  const { data } = await apiClient.get('/production/products', { params });
  return data.data;
};

export const getProductionAnalytics = async (params = {}) => {
  const { data } = await apiClient.get('/production/analytics', { params });
  return data.data;
};
