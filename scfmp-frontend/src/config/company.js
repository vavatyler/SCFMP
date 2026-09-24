export const COMPANY_EMAIL = 'smartbridgetechnologiesltd@gmail.com';
export const COMPANY_PHONE = '+250 789 329 052';
export const COMPANY_SECONDARY_PHONE = '+250 786 339 597';
export const COMPANY_NAME = 'SmartBridge Technologies Ltd';
export const PRODUCT_NAME = 'AgriBridge';
export const COMPANY_LOCATION = 'Cyanika Sector / Nyamagabe District';
export const COMPANY_TAGLINE = 'Build digital solutions for smarter organizations.';
// Put the approved logo at scfmp-frontend/public/brand/smartbridge-logo.png.
// The landing page falls back to the temporary S mark until that file is supplied.
export const COMPANY_LOGO_PATH = '/brand/smartbridge-logo.png';
export const SMARTBRIDGE_PALETTE = Object.freeze({
  navy: '#102C4C',
  blue: '#1687D4',
  mist: '#A5C3D7',
  white: '#FFFFFF',
});

export const COMPANY_SOCIAL_LINKS = Object.freeze({
  x: { label: 'X', handle: '@smartbridgmfma', href: 'https://x.com/smartbridgmfma' },
  instagram: {
    label: 'Instagram',
    handle: '@smartbridgetechnologiesltd',
    href: 'https://instagram.com/smartbridgetechnologiesltd',
  },
});

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
