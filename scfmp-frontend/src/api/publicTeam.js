import apiClient from './client';

export const listPublicTeamMembers = async () => {
  const { data } = await apiClient.get('/public/team');
  return data.data;
};

export const publicMediaUrl = (path) => {
  if (!path || /^https?:\/\//i.test(path)) return path;
  const apiRoot = String(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '');
  return `${apiRoot}${path}`;
};
