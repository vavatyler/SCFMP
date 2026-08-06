import apiClient from './client';

export const login = async (email, password) => {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data.data; // { user, accessToken, refreshToken }
};

export const getProfile = async () => {
  const { data } = await apiClient.get('/auth/me');
  return data.data;
};

export const changePassword = async (current_password, new_password) => {
  const { data } = await apiClient.put('/auth/change-password', { current_password, new_password });
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await apiClient.post('/auth/forgot-password', { email });
  return data;
};

export const resetPasswordWithToken = async (token, new_password) => {
  const { data } = await apiClient.post('/auth/reset-password', { token, new_password });
  return data;
};
