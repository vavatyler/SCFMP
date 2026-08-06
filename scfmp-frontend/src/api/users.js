import apiClient from './client';

export const listUsers = async (params = {}) => {
  const { data } = await apiClient.get('/users', { params });
  return data.data;
};

export const registerUser = async (payload) => {
  const { data } = await apiClient.post('/auth/register', payload);
  return data.data;
};

export const updateUserStatus = async (id, status) => {
  const { data } = await apiClient.put(`/users/${id}/status`, { status });
  return data.data;
};

export const resetUserPassword = async (id, new_password) => {
  const { data } = await apiClient.put(`/users/${id}/reset-password`, { new_password });
  return data;
};
