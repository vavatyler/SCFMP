import { useTranslation } from 'react-i18next';
import { FARM_SIZE_UNIT_OPTIONS } from '../utils/farmerForm';

const FarmSizeFields = ({ idPrefix, form, onChange, errors = {}, disabled = false }) => {
  const { t } = useTranslation();
  const sizeErrorId = `${idPrefix}-size-error`;
  const unitErrorId = `${idPrefix}-unit-error`;

  return (
    <>
      <div className="mb-4">
        <label htmlFor={`${idPrefix}-size`} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('farmers.fields.farmSize')}</label>
        <input
          id={`${idPrefix}-size`}
          type="number"
          inputMode="decimal"
          min="0.01"
          step="any"
          disabled={disabled}
          value={form.farm_size}
          onChange={(event) => onChange({ ...form, farm_size: event.target.value }, 'farm_size')}
          aria-invalid={Boolean(errors.farm_size)}
          aria-describedby={errors.farm_size ? sizeErrorId : undefined}
          className={`focus-ring w-full rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30 ${errors.farm_size ? 'border-clay' : 'border-sand'}`}
        />
        {errors.farm_size && <p id={sizeErrorId} className="mt-1 text-xs text-clay">{errors.farm_size}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor={`${idPrefix}-unit`} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('farmers.fields.farmSizeUnit')}</label>
        <select
          id={`${idPrefix}-unit`}
          disabled={disabled}
          value={form.farm_size_unit}
          onChange={(event) => onChange({ ...form, farm_size_unit: event.target.value }, 'farm_size_unit')}
          aria-invalid={Boolean(errors.farm_size_unit)}
          aria-describedby={errors.farm_size_unit ? unitErrorId : undefined}
          className={`focus-ring w-full rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30 ${errors.farm_size_unit ? 'border-clay' : 'border-sand'}`}
        >
          {FARM_SIZE_UNIT_OPTIONS.map(({ value, labelKey }) => (
            <option key={value} value={value}>{t(labelKey)}</option>
          ))}
        </select>
        {errors.farm_size_unit && <p id={unitErrorId} className="mt-1 text-xs text-clay">{errors.farm_size_unit}</p>}
      </div>
    </>
  );
};

export default FarmSizeFields;
