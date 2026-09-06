import apiClient from './client';

export const listTeamMembers = async (params = {}) => {
  const { data } = await apiClient.get('/team-members', { params });
  return data.data;
};

export const getTeamMember = async (id) => {
  const { data } = await apiClient.get(`/team-members/${id}`);
  return data.data;
};

export const createTeamMember = async (payload) => {
  const { data } = await apiClient.post('/team-members', payload);
  return data.data;
};

export const uploadTeamMemberPhoto = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post('/team-members/photo', formData);
  return data.data.photo_url;
};

export const updateTeamMember = async (id, payload) => {
  const { data } = await apiClient.put(`/team-members/${id}`, payload);
  return data.data;
};

export const deleteTeamMember = async (id) => {
  await apiClient.delete(`/team-members/${id}`);
};
