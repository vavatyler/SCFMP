const { _private } = require('../controllers/reportController');

describe('Report export security and localization', () => {
  it.each(['=2+2', '+SUM(A1:A2)', '-10+20', '@cmd']) (
    'neutralizes spreadsheet formula input: %s',
    (value) => {
      expect(_private.safeCsvValue(value)).toBe(`"'${value}"`);
    }
  );

  it('escapes quotes and consistently wraps CSV cells', () => {
    expect(_private.safeCsvValue('Coffee "Grade A"')).toBe('"Coffee ""Grade A"""');
  });

  it('provides localized report titles and columns for all supported languages', () => {
    for (const language of ['en', 'rw', 'fr']) {
      expect(_private.REPORT_TEXT[language].production).toBeTruthy();
      expect(_private.LABELS[language].cooperative).toBeTruthy();
      expect(_private.LABELS[language].total_value).toBeTruthy();
    }
  });
});
