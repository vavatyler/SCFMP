import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const Modal = ({ title, isOpen, onClose, children, maxWidth = 'max-w-md' }) => {
  const { t } = useTranslation();
  useEffect(() => {
    const handleEscape = (e) => e.key === 'Escape' && onClose();
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] ${maxWidth}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="flex shrink-0 items-center justify-between border-b border-sand px-4 py-4 sm:px-6">
          <h2 id="modal-title" className="font-display text-lg font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="focus-ring rounded-lg p-1 text-ink-soft hover:bg-sand/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
