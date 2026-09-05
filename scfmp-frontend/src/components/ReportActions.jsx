import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { downloadReportCsv, getReport } from '../api/reports';

const ReportActions = ({ moduleName, filters = {} }) => {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const params = { ...filters, language: i18n.resolvedLanguage || i18n.language };

  const handle = async (format) => {
    setBusy(format);
    setError('');
    try {
      if (format === 'csv') {
        const blob = await downloadReportCsv(moduleName, params);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `agribridge-${moduleName}-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const report = await getReport(moduleName, params);
        const { exportReportToExcel, exportReportToPdf, printReport } = await import('../utils/reportExport');
        if (format === 'excel') exportReportToExcel(report);
        if (format === 'pdf') exportReportToPdf(report);
        if (format === 'print') printReport(report);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('reports.failed'));
    } finally {
      setBusy('');
    }
  };

  const actions = [
    ['csv', Download, t('reports.csv')],
    ['excel', FileSpreadsheet, t('reports.excel')],
    ['pdf', FileText, t('reports.pdf')],
    ['print', Printer, t('reports.print')],
  ];

  return (
    <div className="mb-5 rounded-xl border border-sand bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">{t('reports.title')}</p>
        <div className="flex flex-wrap gap-2">
          {actions.map(([format, Icon, label]) => (
            <button
              key={format}
              onClick={() => handle(format)}
              disabled={Boolean(busy)}
              className="focus-ring flex min-h-10 items-center gap-2 rounded-lg border border-sand px-3 py-2 text-sm font-medium text-ink-soft hover:bg-sand/30 hover:text-ink disabled:cursor-wait disabled:opacity-50"
            >
              {busy === format ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              {label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-clay" role="alert">{error}</p>}
    </div>
  );
};

export default ReportActions;
