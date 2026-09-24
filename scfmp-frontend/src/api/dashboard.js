import apiClient from './client';

export const getDashboardSummary = async (params = {}) => {
  const { data } = await apiClient.get('/dashboard/summary', { params });
  return data.data;
};

export const getDashboardAnalytics = async (params = {}) => {
  const { data } = await apiClient.get('/dashboard/analytics', { params });
  return data.data;
};

export const getNotifications = async () => {
  const { data } = await apiClient.get('/notifications');
  return data;
};
