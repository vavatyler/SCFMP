import apiClient from './client';

export const listInventory = async (params = {}) => {
  const { data } = await apiClient.get('/inventory', { params });
  return data.data;
};

export const createInventoryItem = async (payload) => {
  const { data } = await apiClient.post('/inventory', payload);
  return data.data; // { item, openingMovement }
};

export const updateInventoryItem = async (id, payload) => {
  const { data } = await apiClient.put(`/inventory/${id}`, payload);
  return data.data;
};

export const deleteInventoryItem = async (id) => {
  await apiClient.delete(`/inventory/${id}`);
};

export const recordInventoryMovement = async (itemId, payload) => {
  const { data } = await apiClient.post(`/inventory/${itemId}/movements`, payload);
  return data.data; // { item, movement }
};
