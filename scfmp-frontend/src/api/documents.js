import apiClient from './client';

export const listDocuments = async (params = {}) => {
  const { data } = await apiClient.get('/documents', { params });
  return data.data;
};

export const uploadDocument = async ({ file, ...metadata }) => {
  const formData = new FormData();
  formData.append('file', file);
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') formData.append(key, value);
  });

  const { data } = await apiClient.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
};

export const getDocumentClassification = async (params = {}) => {
  const { data } = await apiClient.get('/documents/classification/options', { params });
  return data.data;
};

export const getDocumentStats = async (params = {}) => {
  const { data } = await apiClient.get('/documents/stats/summary', { params });
  return data.data;
};

export const updateDocument = async (id, metadata) => {
  const { data } = await apiClient.put(`/documents/${id}`, metadata);
  return data.data;
};

export const replaceDocumentFile = async (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.put(`/documents/${id}/file`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
};

export const setDocumentArchived = async (id, archived) => {
  const { data } = await apiClient.put(`/documents/${id}/archive`, { archived });
  return data.data;
};

export const viewDocument = async (id, filename) => {
  const response = await apiClient.get(`/documents/${id}/download`, {
    params: { disposition: 'inline' },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: response.data.type }));
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.URL.revokeObjectURL(url);
    return downloadDocument(id, filename);
  }
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  return undefined;
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
