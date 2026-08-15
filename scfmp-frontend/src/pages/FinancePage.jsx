import { useEffect, useState } from 'react';
import { Plus, Loader2, Landmark, Receipt, Pencil, Trash2 } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import ReportActions from '../components/ReportActions';
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
  listLoans,
  createLoan,
  repayLoan,
} from '../api/finance';
import { listMembers } from '../api/members';
import { useAuth } from '../context/AuthContext';
import { useCooperative } from '../context/CooperativeContext';
import { useTranslation } from 'react-i18next';

const emptyTxnForm = {
  type: 'income',
  category: '',
  amount: '',
  member_id: '',
  transaction_date: '',
};

const emptyLoanForm = {
  member_id: '',
  principal_amount: '',
  interest_rate: '',
  issue_date: '',
  due_date: '',
};

const FinancePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { cooperativeScope, activeCooperativeId } = useCooperative();

  const [tab, setTab] = useState('transactions'); // 'transactions' | 'loans'
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null); // null = creating; object = editing this transaction
  const [txnForm, setTxnForm] = useState(emptyTxnForm);
  const [txnError, setTxnError] = useState('');
  const [isDeletingTxn, setIsDeletingTxn] = useState(false);

  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanForm, setLoanForm] = useState(emptyLoanForm);
  const [loanError, setLoanError] = useState('');

  const [repayingLoan, setRepayingLoan] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState('');
  const [repayError, setRepayError] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const fetchAll = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [summaryRes, txnRes, loanRes, membersRes] = await Promise.all([
        getTransactionSummary(cooperativeScope),
        listTransactions(cooperativeScope),
        listLoans(cooperativeScope),
        listMembers(cooperativeScope),
      ]);
      setSummary(summaryRes);
      setTransactions(txnRes.data);
      setLoans(loanRes.data);
      setMembers(membersRes.data);
    } catch (err) {
      setError('Could not load financial data. Is the backend server running?');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [activeCooperativeId]);

  const openCreateTxnModal = () => {
    setEditingTxn(null);
    setTxnForm(emptyTxnForm);
    setTxnError('');
    setIsTxnModalOpen(true);
  };

  const openEditTxnModal = (txn) => {
    setEditingTxn(txn);
    setTxnForm({
      type: txn.type,
      category: txn.category || '',
      amount: txn.amount,
      member_id: txn.member_id || '',
      transaction_date: txn.transaction_date,
    });
    setTxnError('');
    setIsTxnModalOpen(true);
  };

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    setTxnError('');
    setIsSaving(true);
    try {
      if (editingTxn) {
        const { member_id, ...rest } = txnForm;
        const payload = member_id ? { ...rest, member_id } : rest;
        await updateTransaction(editingTxn.id, payload);
      } else {
        const payload = { ...txnForm, ...cooperativeScope };
        if (!payload.member_id) delete payload.member_id;
        await createTransaction(payload);
      }
      setIsTxnModalOpen(false);
      setTxnForm(emptyTxnForm);
      fetchAll();
    } catch (err) {
      setTxnError(
        err.response?.data?.message || `Could not ${editingTxn ? 'update' : 'save'} this transaction.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTransaction = async (txn) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    setIsDeletingTxn(true);
    try {
      await deleteTransaction(txn.id);
      fetchAll();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not delete this transaction.');
    } finally {
      setIsDeletingTxn(false);
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    setLoanError('');
    setIsSaving(true);
    try {
      await createLoan({ ...loanForm, ...cooperativeScope });
      setIsLoanModalOpen(false);
      setLoanForm(emptyLoanForm);
      fetchAll();
    } catch (err) {
      setLoanError(err.response?.data?.message || 'Could not issue this loan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    setRepayError('');
    setIsSaving(true);
    try {
      await repayLoan(repayingLoan.id, { amount: repayAmount, repayment_date: repayDate });
      setRepayingLoan(null);
      setRepayAmount('');
      setRepayDate('');
      fetchAll();
    } catch (err) {
      setRepayError(err.response?.data?.message || 'Could not record this repayment.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center text-ink-soft">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading financial data…
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-xl bg-clay/5 p-6 text-sm text-clay">{error}</div>
      </DashboardLayout>
    );
  }

  // Safety net: same race condition guard as DashboardPage — never render off a null summary.
  if (!summary) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center text-ink-soft">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading financial data…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('common.finance')} subtitle={t('modules.financeSubtitle')}>
      <ReportActions moduleName="finance" filters={cooperativeScope} />
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="Income" value={summary.income} accent="gold" isCurrency />
        <StatCard label="Expenses" value={summary.expense} accent="clay" isCurrency />
        <StatCard
          label="Net balance"
          value={summary.net_balance}
          accent={summary.net_balance >= 0 ? 'gold' : 'clay'}
          isCurrency
        />
      </div>

      <div className="mb-5 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-sand/40 p-1">
          <button
            onClick={() => setTab('transactions')}
            className={`focus-ring flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === 'transactions' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft'
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            Transactions
          </button>
          <button
            onClick={() => setTab('loans')}
            className={`focus-ring flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === 'loans' ? 'bg-white text-ink shadow-sm' : 'text-ink-soft'
            }`}
          >
            <Landmark className="h-3.5 w-3.5" />
            Loans
          </button>
        </div>

        {tab === 'transactions' ? (
          <button
            onClick={openCreateTxnModal}
            className="focus-ring flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light"
          >
            <Plus className="h-4 w-4" />
            Add transaction
          </button>
        ) : (
          <button
            onClick={() => setIsLoanModalOpen(true)}
            disabled={members.length === 0}
            className="focus-ring flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Issue loan
          </button>
        )}
      </div>

      {tab === 'transactions' && (
        <div className="overflow-hidden rounded-xl bg-white shadow-card">
          {transactions.length === 0 ? (
            <div className="p-10 text-center text-sm text-ink-soft">
              No transactions recorded yet.
            </div>
          ) : (
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="transition-colors hover:bg-sand/20">
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          txn.type === 'income'
                            ? 'bg-gold/15 text-gold-dark'
                            : txn.type === 'expense'
                              ? 'bg-clay/10 text-clay'
                              : 'bg-forest/10 text-forest'
                        }`}
                      >
                        {txn.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft">{txn.category || '—'}</td>
                    <td className="px-5 py-3.5 text-ink-soft">
                      {txn.member ? `${txn.member.first_name} ${txn.member.last_name}` : '—'}
                    </td>
                    <td className="figure px-5 py-3.5 font-medium text-ink">
                      {Number(txn.amount).toLocaleString('en-RW')} RWF
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft">{txn.transaction_date}</td>
                    <td className="px-5 py-3.5 text-right">
                      {!txn.loan_id && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditTxnModal(txn)}
                            title="Edit"
                            className="focus-ring rounded-lg border border-sand p-1.5 text-ink-soft hover:bg-sand/30 hover:text-ink"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(txn)}
                            disabled={isDeletingTxn}
                            title="Delete"
                            className="focus-ring rounded-lg border border-sand p-1.5 text-ink-soft hover:bg-clay/10 hover:text-clay disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'loans' && (
        <div className="overflow-hidden rounded-xl bg-white shadow-card">
          {loans.length === 0 ? (
            <div className="p-10 text-center text-sm text-ink-soft">
              {members.length === 0
                ? 'Add a member first, then come back to issue a loan.'
                : 'No loans issued yet.'}
            </div>
          ) : (
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="border-b border-sand bg-sand/30 text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-5 py-3 font-medium">Member</th>
                  <th className="px-5 py-3 font-medium">Principal</th>
                  <th className="px-5 py-3 font-medium">Balance</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Issued</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {loans.map((loan) => (
                  <tr key={loan.id} className="transition-colors hover:bg-sand/20">
                    <td className="px-5 py-3.5 font-medium text-ink">
                      {loan.member ? `${loan.member.first_name} ${loan.member.last_name}` : '—'}
                    </td>
                    <td className="figure px-5 py-3.5 text-ink-soft">
                      {Number(loan.principal_amount).toLocaleString('en-RW')} RWF
                    </td>
                    <td className="figure px-5 py-3.5 font-medium text-clay">
                      {Number(loan.balance).toLocaleString('en-RW')} RWF
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        status={
                          loan.status === 'active'
                            ? 'active'
                            : loan.status === 'paid'
                              ? 'inactive'
                              : 'suspended'
                        }
                      >
                        {loan.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft">{loan.issue_date}</td>
                    <td className="px-5 py-3.5 text-right">
                      {loan.status === 'active' && (
                        <button
                          onClick={() => setRepayingLoan(loan)}
                          className="focus-ring rounded-lg border border-sand px-3 py-1.5 text-xs font-medium text-forest hover:bg-forest/5"
                        >
                          Record repayment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal
        title={editingTxn ? 'Edit transaction' : 'Add transaction'}
        isOpen={isTxnModalOpen}
        onClose={() => setIsTxnModalOpen(false)}
      >
        <form onSubmit={handleSubmitTransaction}>
          {txnError && (
            <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay">
              {txnError}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Type
            </label>
            <select
              value={txnForm.type}
              onChange={(e) => setTxnForm({ ...txnForm, type: e.target.value })}
              disabled={!!editingTxn}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm disabled:bg-sand/30 disabled:text-ink-soft"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="saving">Saving</option>
            </select>
            {editingTxn && (
              <p className="mt-1 text-xs text-ink-soft">
                Type can't be changed after creation — delete and re-add if needed.
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Category
            </label>
            <input
              value={txnForm.category}
              onChange={(e) => setTxnForm({ ...txnForm, category: e.target.value })}
              placeholder="e.g. Coffee sales, Fertilizer purchase"
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Member (optional)
            </label>
            <select
              value={txnForm.member_id}
              onChange={(e) => setTxnForm({ ...txnForm, member_id: e.target.value })}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            >
              <option value="">Not tied to a member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Amount (RWF)
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={txnForm.amount}
                onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Date
              </label>
              <input
                required
                type="date"
                value={txnForm.transaction_date}
                onChange={(e) => setTxnForm({ ...txnForm, transaction_date: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving…' : editingTxn ? 'Save changes' : 'Save transaction'}
          </button>
        </form>
      </Modal>

      <Modal title="Issue loan" isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)}>
        <form onSubmit={handleCreateLoan}>
          {loanError && (
            <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay">
              {loanError}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              Member
            </label>
            <select
              required
              value={loanForm.member_id}
              onChange={(e) => setLoanForm({ ...loanForm, member_id: e.target.value })}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
            >
              <option value="">Select a member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Principal (RWF)
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={loanForm.principal_amount}
                onChange={(e) => setLoanForm({ ...loanForm, principal_amount: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Interest rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={loanForm.interest_rate}
                onChange={(e) => setLoanForm({ ...loanForm, interest_rate: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Issue date
              </label>
              <input
                required
                type="date"
                value={loanForm.issue_date}
                onChange={(e) => setLoanForm({ ...loanForm, issue_date: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                Due date
              </label>
              <input
                type="date"
                value={loanForm.due_date}
                onChange={(e) => setLoanForm({ ...loanForm, due_date: e.target.value })}
                className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Issuing…' : 'Issue loan'}
          </button>
        </form>
      </Modal>

      <Modal title="Record repayment" isOpen={!!repayingLoan} onClose={() => setRepayingLoan(null)}>
        {repayingLoan && (
          <form onSubmit={handleRepay}>
            {repayError && (
              <div className="mb-4 rounded-lg bg-clay/10 px-3.5 py-2.5 text-sm text-clay">
                {repayError}
              </div>
            )}

            <div className="mb-4 rounded-lg bg-sand/30 px-4 py-3">
              <p className="text-xs text-ink-soft">Current balance</p>
              <p className="figure text-lg font-semibold text-ink">
                {Number(repayingLoan.balance).toLocaleString('en-RW')} RWF
              </p>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Amount (RWF)
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  max={repayingLoan.balance}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Date
                </label>
                <input
                  required
                  type="date"
                  value={repayDate}
                  onChange={(e) => setRepayDate(e.target.value)}
                  className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-medium text-paper hover:bg-forest-light disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Recording…' : 'Record repayment'}
            </button>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default FinancePage;
