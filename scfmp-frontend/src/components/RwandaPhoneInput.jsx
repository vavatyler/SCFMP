import { useTranslation } from 'react-i18next';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import {
  isValidRwandaLocalPhone,
  RWANDA_PHONE_COUNTRY_CODE,
  RWANDA_PHONE_LOCAL_LENGTH,
  sanitizeRwandaPhoneInput,
  toLocalRwandaPhone,
} from '../utils/validation';

const RwandaPhoneInput = ({ id, value, onChange, required = false, disabled = false }) => {
  const { t } = useTranslation();
  const digits = String(value || '');
  const isEmpty = digits.length === 0;
  const isValid = isValidRwandaLocalPhone(digits);
  const isInvalid = !isEmpty && !isValid;
  const remaining = Math.max(0, RWANDA_PHONE_LOCAL_LENGTH - digits.length);

  const handleChange = (event) => {
    onChange(sanitizeRwandaPhoneInput(event.target.value, digits));
  };

  const handlePaste = (event) => {
    const localPhone = toLocalRwandaPhone(event.clipboardData.getData('text'));
    if (localPhone === null || localPhone === '') return;
    event.preventDefault();
    onChange(localPhone);
  };

  return (
    <div>
      <div
        className={`flex overflow-hidden rounded-lg border bg-white ${
          isValid ? 'border-forest' : isInvalid ? 'border-clay' : 'border-sand'
        }`}
      >
        <span className="flex items-center border-r border-sand bg-sand/30 px-3 text-sm text-ink-soft">
          {RWANDA_PHONE_COUNTRY_CODE}
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          disabled={disabled}
          value={digits}
          onChange={handleChange}
          onPaste={handlePaste}
          maxLength={RWANDA_PHONE_LOCAL_LENGTH}
          pattern="[0-9]{9}"
          placeholder={t('validation.phonePlaceholder')}
          aria-invalid={isInvalid}
          aria-describedby={`${id}-feedback`}
          className="focus-ring min-w-0 flex-1 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-sand/30 disabled:text-ink-soft"
        />
        {(isValid || isInvalid) && (
          <span className={`flex items-center px-3 ${isValid ? 'text-forest' : 'text-clay'}`}>
            {isValid ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
          </span>
        )}
      </div>
      <p
        id={`${id}-feedback`}
        className={`mt-1 text-xs ${isInvalid ? 'text-clay' : isValid ? 'text-forest' : 'text-ink-soft'}`}
      >
        {isValid
          ? t('validation.phoneValid')
          : isEmpty
            ? required ? t('validation.phoneRequired') : t('validation.phoneOptional')
            : t('validation.phoneRemaining', { count: remaining })}
      </p>
    </div>
  );
};

export default RwandaPhoneInput;
