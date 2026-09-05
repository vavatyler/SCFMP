import apiClient from './client';

export const listTeamMembers = async (params = {}) => {
  const { data } = await apiClient.get('/team-members', { params });
  return data.data;
};

export const createTeamMember = async (payload) => {
  const { data } = await apiClient.post('/team-members', payload);
  return data.data;
};

export const updateTeamMember = async (id, payload) => {
  const { data } = await apiClient.put(`/team-members/${id}`, payload);
  return data.data;
};

export const deleteTeamMember = async (id) => {
  await apiClient.delete(`/team-members/${id}`);
};
