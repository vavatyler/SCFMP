import apiClient from './client';

export const listFarmers = async (params = {}) => {
  const { data } = await apiClient.get('/farmers', { params });
  return data.data;
};

export const listEligibleFarmerMembers = async (params = {}) => {
  const { data } = await apiClient.get('/farmers/eligible-members', { params });
  return data.data;
};

export const getFarmer = async (id) => {
  const { data } = await apiClient.get(`/farmers/${id}`);
  return data.data;
};

export const createFarmer = async (payload) => {
  const { data } = await apiClient.post('/farmers', payload);
  return data.data;
};

export const updateFarmer = async (id, payload) => {
  const { data } = await apiClient.put(`/farmers/${id}`, payload);
  return data.data;
};
