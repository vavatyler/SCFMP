import apiClient from './client';

export const getReport = async (moduleName, params = {}) => {
  const { data } = await apiClient.get(`/reports/${moduleName}`, { params: { ...params, format: 'json' } });
  return data.data;
};

export const downloadReportCsv = async (moduleName, params = {}) => {
  const response = await apiClient.get(`/reports/${moduleName}`, {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  });
  return response.data;
};
