import apiClient from './client';

export const getSubscriptionOverview = async (params = {}) => {
  const { data } = await apiClient.get('/subscriptions', { params });
  return data.data;
};
