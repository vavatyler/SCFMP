import { useTranslation } from 'react-i18next';
import RwandaLocationFields from './RwandaLocationFields';
import RwandaPhoneInput from './RwandaPhoneInput';
import {
  applyMemberAddressLocation,
  getMemberAddressLocation,
  MEMBER_GENDERS,
} from '../utils/memberForm';

const MemberFormFields = ({ idPrefix, form, onChange, errors = {}, disabled = false }) => {
  const { t } = useTranslation();
  const setField = (field, value) => onChange({ ...form, [field]: value }, field);
  const setAddressLocation = (location) => onChange(
    applyMemberAddressLocation(form, location),
    'address_location'
  );

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-first-name`} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('members.fields.firstName')}</label>
          <input
            id={`${idPrefix}-first-name`}
            autoComplete="given-name"
            required
            maxLength={100}
            disabled={disabled}
            value={form.first_name}
            onChange={(event) => setField('first_name', event.target.value)}
            aria-invalid={Boolean(errors.first_name)}
            aria-describedby={errors.first_name ? `${idPrefix}-first-name-error` : undefined}
            className={`focus-ring w-full rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30 ${errors.first_name ? 'border-clay' : 'border-sand'}`}
          />
          {errors.first_name && <p id={`${idPrefix}-first-name-error`} className="mt-1 text-xs text-clay">{errors.first_name}</p>}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-last-name`} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('members.fields.lastName')}</label>
          <input
            id={`${idPrefix}-last-name`}
            autoComplete="family-name"
            required
            maxLength={100}
            disabled={disabled}
            value={form.last_name}
            onChange={(event) => setField('last_name', event.target.value)}
            aria-invalid={Boolean(errors.last_name)}
            aria-describedby={errors.last_name ? `${idPrefix}-last-name-error` : undefined}
            className={`focus-ring w-full rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30 ${errors.last_name ? 'border-clay' : 'border-sand'}`}
          />
          {errors.last_name && <p id={`${idPrefix}-last-name-error`} className="mt-1 text-xs text-clay">{errors.last_name}</p>}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor={`${idPrefix}-national-id`} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('members.fields.nationalId')}</label>
        <input
          id={`${idPrefix}-national-id`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]{16}"
          maxLength={16}
          disabled={disabled}
          value={form.national_id}
          onChange={(event) => setField('national_id', event.target.value)}
          placeholder={t('members.placeholders.nationalId')}
          aria-invalid={Boolean(errors.national_id)}
          aria-describedby={errors.national_id ? `${idPrefix}-national-id-error` : undefined}
          className={`focus-ring w-full rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30 ${errors.national_id ? 'border-clay' : 'border-sand'}`}
        />
        {errors.national_id && <p id={`${idPrefix}-national-id-error`} className="mt-1 text-xs text-clay">{errors.national_id}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor={`${idPrefix}-gender`} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('members.fields.gender')}</label>
        <select
          id={`${idPrefix}-gender`}
          disabled={disabled}
          value={form.gender}
          onChange={(event) => setField('gender', event.target.value)}
          className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30"
        >
          <option value="">{t('members.gender.notSpecified')}</option>
          {MEMBER_GENDERS.map((gender) => <option key={gender} value={gender}>{t(`members.gender.${gender}`)}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor={`${idPrefix}-phone`} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('members.fields.phone')}</label>
        <RwandaPhoneInput
          id={`${idPrefix}-phone`}
          value={form.phone}
          onChange={(phone) => setField('phone', phone)}
          disabled={disabled}
        />
      </div>

      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">{t('members.fields.residentialAddress')}</p>
        <p className="mb-3 text-xs text-ink-soft">{t('members.addressHierarchyHint')}</p>
        <RwandaLocationFields
          idPrefix={`${idPrefix}-address`}
          value={getMemberAddressLocation(form)}
          onChange={setAddressLocation}
          includeVillage
          disabled={disabled}
        />
        {errors.address_location && <p className="mt-2 text-xs text-clay">{errors.address_location}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor={`${idPrefix}-address-details`} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('members.fields.addressDetails')}</label>
        <input
          id={`${idPrefix}-address-details`}
          autoComplete="street-address"
          maxLength={255}
          disabled={disabled}
          value={form.address}
          onChange={(event) => setField('address', event.target.value)}
          placeholder={t('members.placeholders.address')}
          className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30"
        />
        <p className="mt-1 text-xs text-ink-soft">{t('members.legacyAddressHint')}</p>
      </div>

      <div className="mb-6">
        <label htmlFor={`${idPrefix}-membership-date`} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">{t('members.fields.membershipDate')}</label>
        <input
          id={`${idPrefix}-membership-date`}
          type="date"
          disabled={disabled}
          value={form.membership_date}
          onChange={(event) => setField('membership_date', event.target.value)}
          className="focus-ring w-full rounded-lg border border-sand px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30"
        />
      </div>
    </>
  );
};

export default MemberFormFields;
