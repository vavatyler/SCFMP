import apiClient from './client';

// Transactions
export const listTransactions = async (params = {}) => {
  const { data } = await apiClient.get('/transactions', { params });
  return data;
};

export const createTransaction = async (payload) => {
  const { data } = await apiClient.post('/transactions', payload);
  return data.data;
};

export const updateTransaction = async (id, payload) => {
  const { data } = await apiClient.put(`/transactions/${id}`, payload);
  return data.data;
};

export const deleteTransaction = async (id) => {
  await apiClient.delete(`/transactions/${id}`);
};

export const getTransactionSummary = async (params = {}) => {
  const { data } = await apiClient.get('/transactions/summary', { params });
  return data.data;
};

export const getTransactionCategories = async () => {
  const { data } = await apiClient.get('/transactions/categories');
  return data.data;
};

// Loans
export const listLoans = async (params = {}) => {
  const { data } = await apiClient.get('/loans', { params });
  return data;
};

export const createLoan = async (payload) => {
  const { data } = await apiClient.post('/loans', payload);
  return data.data; // { loan, disbursement }
};

export const repayLoan = async (id, payload) => {
  const { data } = await apiClient.post(`/loans/${id}/repay`, payload);
  return data.data; // { loan, repayment }
};
