import apiClient from './client';

export const listNotifications = async (params = {}) => {
  const { data } = await apiClient.get('/notifications', { params });
  return data; // { data, unread_count, pagination }
};

export const markNotificationRead = async (id) => {
  const { data } = await apiClient.put(`/notifications/${id}/read`);
  return data.data;
};

export const markAllNotificationsRead = async () => {
  await apiClient.put('/notifications/read-all');
};
