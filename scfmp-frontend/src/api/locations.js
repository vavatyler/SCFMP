import apiClient from './client';

const get = async (path, params) => {
  const { data } = await apiClient.get(path, { params });
  return data.data;
};

const requestCache = new Map();

const cachedGet = (key, path, params) => {
  if (!requestCache.has(key)) {
    const request = get(path, params).catch((error) => {
      requestCache.delete(key);
      throw error;
    });
    requestCache.set(key, request);
  }
  return requestCache.get(key);
};

export const listDistricts = () => cachedGet('districts', '/locations/districts');
export const listSectors = (district) => (
  cachedGet(`sectors:${district}`, '/locations/sectors', { district })
);
export const listCells = (district, sector) => (
  cachedGet(`cells:${district}:${sector}`, '/locations/cells', { district, sector })
);
export const listVillages = (district, sector, cell) => (
  cachedGet(
    `villages:${district}:${sector}:${cell}`,
    '/locations/villages',
    { district, sector, cell }
  )
);
