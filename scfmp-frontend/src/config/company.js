export const COMPANY_EMAIL = 'info@smartdigitalsolutions.com';
export const COMPANY_PHONE = '+250 789 329 052';
export const COMPANY_NAME = 'SmartBridge Technologies Ltd';
export const PRODUCT_NAME = 'AgriBridge';

export const createCompanyContact = ({ email, phone }) => {
  const normalizedEmail = String(email).trim();
  const displayPhone = String(phone).trim();
  const phoneDigits = displayPhone.replace(/\D/g, '');
  const normalizedPhone = `${displayPhone.startsWith('+') ? '+' : ''}${phoneDigits}`;

  return Object.freeze({
    email: normalizedEmail,
    phone: displayPhone,
    emailUrl: `mailto:${normalizedEmail}`,
    phoneUrl: `tel:${normalizedPhone}`,
    whatsappUrl: `https://wa.me/${phoneDigits}`,
  });
};

export const COMPANY_CONTACT = createCompanyContact({
  email: COMPANY_EMAIL,
  phone: COMPANY_PHONE,
});
