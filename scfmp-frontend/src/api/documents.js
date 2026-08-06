import apiClient from './client';

export const listDocuments = async (params = {}) => {
  const { data } = await apiClient.get('/documents', { params });
  return data.data;
};

export const uploadDocument = async ({ file, owner_type, owner_id, description }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('owner_type', owner_type);
  formData.append('owner_id', owner_id);
  if (description) formData.append('description', description);

  const { data } = await apiClient.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
};

export const downloadDocument = async (id, filename) => {
  const response = await apiClient.get(`/documents/${id}/download`, { responseType: 'blob' });
  // Trigger a browser download using the original filename
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || 'document');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const deleteDocument = async (id) => {
  await apiClient.delete(`/documents/${id}`);
};
