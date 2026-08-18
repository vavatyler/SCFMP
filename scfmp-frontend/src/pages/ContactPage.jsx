import { Mail, MessageCircle, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../components/DashboardLayout';
import { COMPANY_CONTACT } from '../config/company';

const CONTACTS = [
  { key: 'email', value: COMPANY_CONTACT.email, href: COMPANY_CONTACT.emailUrl, icon: Mail },
  { key: 'phone', value: COMPANY_CONTACT.phone, href: COMPANY_CONTACT.phoneUrl, icon: Phone },
  { key: 'whatsapp', value: COMPANY_CONTACT.phone, href: COMPANY_CONTACT.whatsappUrl, icon: MessageCircle, external: true },
];

const ContactPage = () => {
  const { t } = useTranslation();

  return (
    <DashboardLayout title={t('contact.title')} subtitle={t('contact.subtitle')}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {CONTACTS.map(({ key, value, href, icon: Icon, external }) => (
          <section key={key} className="rounded-xl bg-white p-6 shadow-card">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-forest/10 text-forest">
              <Icon aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2 className="font-display text-base font-semibold text-ink">{t(`contact.${key}`)}</h2>
            <p className="mt-1 break-words text-sm text-ink-soft">{value}</p>
            <a
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-light"
            >
              {t(`contact.${key}Action`)}
            </a>
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default ContactPage;
