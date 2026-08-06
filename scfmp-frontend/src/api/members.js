import apiClient from './client';

export const listMembers = async (params = {}) => {
  const { data } = await apiClient.get('/members', { params });
  return data; // { data, pagination }
};

export const getMember = async (id) => {
  const { data } = await apiClient.get(`/members/${id}`);
  return data.data;
};

export const createMember = async (payload) => {
  const { data } = await apiClient.post('/members', payload);
  return data.data;
};

export const updateMember = async (id, payload) => {
  const { data } = await apiClient.put(`/members/${id}`, payload);
  return data.data;
};

export const deleteMember = async (id) => {
  await apiClient.delete(`/members/${id}`);
};
