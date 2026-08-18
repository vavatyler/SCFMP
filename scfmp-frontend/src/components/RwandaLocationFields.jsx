import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listCells, listDistricts, listSectors, listVillages } from '../api/locations';
import { applyLocationChange } from '../utils/locationHierarchy';

const withCurrentOption = (options, current) => {
  if (!current || options.some((option) => option.name === current)) return options;
  return [{ code: `legacy-${current}`, name: current, legacy: true }, ...options];
};

const LOCATION_PLACEHOLDERS = {
  district: { loading: 'locations.loadingDistricts', select: 'locations.selectDistrict' },
  sector: { loading: 'locations.loadingSectors', select: 'locations.selectSector', parent: 'district', selectParent: 'locations.selectDistrictFirst' },
  cell: { loading: 'locations.loadingCells', select: 'locations.selectCell', parent: 'sector', selectParent: 'locations.selectSectorFirst' },
  village: { loading: 'locations.loadingVillages', select: 'locations.selectVillage', parent: 'cell', selectParent: 'locations.selectCellFirst' },
};

const placeholderKeyFor = (key, value, isLoading) => {
  const placeholder = LOCATION_PLACEHOLDERS[key];
  if (isLoading) return placeholder.loading;
  if (placeholder.parent && !value[placeholder.parent]) return placeholder.selectParent;
  return placeholder.select;
};

const RwandaLocationFields = ({
  value,
  onChange,
  includeVillage = false,
  disabled = false,
  idPrefix = 'location',
}) => {
  const { t } = useTranslation();
  const [districts, setDistricts] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [cells, setCells] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState({ district: true, sector: false, cell: false, village: false });
  const [loadErrors, setLoadErrors] = useState({});

  const setLevelLoading = (level, isLoading) => {
    setLoading((current) => ({ ...current, [level]: isLoading }));
  };

  const setLevelError = (level, message = '') => {
    setLoadErrors((current) => ({ ...current, [level]: message }));
  };

  useEffect(() => {
    let active = true;
    setLevelLoading('district', true);
    setLevelError('district');
    listDistricts()
      .then((items) => { if (active) setDistricts(items); })
      .catch(() => {
        if (!active) return;
        setDistricts([]);
        setLevelError('district', t('locations.loadError'));
      })
      .finally(() => { if (active) setLevelLoading('district', false); });
    return () => { active = false; };
  }, [t]);

  useEffect(() => {
    let active = true;
    setSectors([]);
    setLevelError('sector');
    if (!value.district) {
      setLevelLoading('sector', false);
      return () => { active = false; };
    }
    setLevelLoading('sector', true);
    listSectors(value.district)
      .then((items) => { if (active) setSectors(items); })
      .catch(() => {
        if (!active) return;
        setLevelError('sector', t('locations.loadError'));
      })
      .finally(() => { if (active) setLevelLoading('sector', false); });
    return () => { active = false; };
  }, [value.district, t]);

  useEffect(() => {
    let active = true;
    setCells([]);
    setLevelError('cell');
    if (!value.district || !value.sector) {
      setLevelLoading('cell', false);
      return () => { active = false; };
    }
    setLevelLoading('cell', true);
    listCells(value.district, value.sector)
      .then((items) => { if (active) setCells(items); })
      .catch(() => {
        if (!active) return;
        setLevelError('cell', t('locations.loadError'));
      })
      .finally(() => { if (active) setLevelLoading('cell', false); });
    return () => { active = false; };
  }, [value.district, value.sector, t]);

  useEffect(() => {
    let active = true;
    setVillages([]);
    setLevelError('village');
    if (!includeVillage || !value.district || !value.sector || !value.cell) {
      setLevelLoading('village', false);
      return () => { active = false; };
    }
    setLevelLoading('village', true);
    listVillages(value.district, value.sector, value.cell)
      .then((items) => { if (active) setVillages(items); })
      .catch(() => {
        if (!active) return;
        setLevelError('village', t('locations.loadError'));
      })
      .finally(() => { if (active) setLevelLoading('village', false); });
    return () => { active = false; };
  }, [includeVillage, value.district, value.sector, value.cell, t]);

  const displayedDistricts = useMemo(
    () => withCurrentOption(districts, value.district),
    [districts, value.district]
  );
  const displayedSectors = useMemo(
    () => withCurrentOption(sectors, value.sector),
    [sectors, value.sector]
  );
  const displayedCells = useMemo(
    () => withCurrentOption(cells, value.cell),
    [cells, value.cell]
  );
  const displayedVillages = useMemo(
    () => withCurrentOption(villages, value.village),
    [villages, value.village]
  );

  const update = (field, fieldValue) => onChange(applyLocationChange(value, field, fieldValue));

  const fields = [
    { key: 'district', options: displayedDistricts, enabled: districts.length > 0 },
    { key: 'sector', options: displayedSectors, enabled: Boolean(value.district) && sectors.length > 0 },
    { key: 'cell', options: displayedCells, enabled: Boolean(value.sector) && cells.length > 0 },
    ...(includeVillage
      ? [{ key: 'village', options: displayedVillages, enabled: Boolean(value.cell) && villages.length > 0 }]
      : []),
  ];

  const loadError = Object.values(loadErrors).find(Boolean);

  return (
    <div>
      <div className={`grid grid-cols-1 gap-3 ${includeVillage ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        {fields.map(({ key, options, enabled }) => (
          <div key={key}>
            <label htmlFor={`${idPrefix}-${key}`} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
              {t(`locations.${key}`)}
            </label>
            <select
              id={`${idPrefix}-${key}`}
              value={value[key] || ''}
              onChange={(event) => update(key, event.target.value)}
              disabled={disabled || loading[key] || Boolean(loadErrors[key]) || !enabled}
              aria-busy={loading[key]}
              className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30 disabled:text-ink-soft"
            >
              <option value="">{t(placeholderKeyFor(key, value, loading[key]))}</option>
              {options.map((option) => (
                <option key={option.code} value={option.name}>
                  {option.name}{option.legacy ? ` (${t('locations.savedValue')})` : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {loadError && <p className="mt-2 text-xs text-clay">{loadError}</p>}
    </div>
  );
};

export default RwandaLocationFields;
