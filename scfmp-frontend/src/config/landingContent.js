import {
  COMPANY_EMAIL,
  COMPANY_LOCATION,
  COMPANY_NAME,
  COMPANY_PHONE,
  COMPANY_SECONDARY_PHONE,
  COMPANY_SOCIAL_LINKS,
  COMPANY_TAGLINE,
  PRODUCT_NAME,
  createCompanyContact,
} from './company';

export const landingCompany = Object.freeze({
  name: COMPANY_NAME,
  productName: PRODUCT_NAME,
  tagline: COMPANY_TAGLINE,
  email: COMPANY_EMAIL,
  phones: [
    createCompanyContact({ email: COMPANY_EMAIL, phone: COMPANY_PHONE }),
    createCompanyContact({ email: COMPANY_EMAIL, phone: COMPANY_SECONDARY_PHONE }),
  ],
  location: COMPANY_LOCATION,
  socialLinks: COMPANY_SOCIAL_LINKS,
});

export const landingServices = Object.freeze([
  {
    id: 'management',
    title: 'Digital Management Systems',
    description: 'Practical systems that bring everyday organizational records and workflows into one reliable place.',
    icon: 'layout-dashboard',
  },
  {
    id: 'development',
    title: 'Software & Web Development',
    description: 'Purpose-built digital tools shaped around the real work of organizations and their communities.',
    icon: 'code-2',
  },
  {
    id: 'transformation',
    title: 'Digital Transformation',
    description: 'A considered move from disconnected manual processes to useful, accessible digital operations.',
    icon: 'git-branch',
  },
  {
    id: 'technology',
    title: 'IT & Technology Solutions',
    description: 'Technology support that helps teams work with confidence and make better use of information.',
    icon: 'cpu',
  },
  {
    id: 'agribridge',
    title: 'AgriBridge Platform',
    description: 'A SmartBridge Technologies platform for connected agricultural and organization management.',
    icon: 'sprout',
    featured: true,
  },
]);

export const agribridgeFeatures = Object.freeze([
  { title: 'Organization Management', description: 'Manage registered organizations and their operating context.' },
  { title: 'Members & Farmers', description: 'Keep member and farmer profiles organized and accessible to authorized teams.' },
  { title: 'Production & Inventory', description: 'Record production activity and maintain inventory workflows in the same platform.' },
  { title: 'Finance & Records', description: 'Organize financial entries and important organization documents with controlled access.' },
  { title: 'Reports', description: 'Filter and export operational reports to support informed review and planning.' },
  { title: 'Team Management', description: 'Maintain approved team profiles and platform access through the existing administration tools.' },
]);

export const platformBenefits = Object.freeze([
  { title: 'Centralized management', description: 'Bring relevant organizational information and workflows into one connected platform.' },
  { title: 'Better visibility', description: 'Find the operational records and reports that authorized teams need more efficiently.' },
  { title: 'Digital records', description: 'Reduce dependency on scattered manual files with organized digital recordkeeping.' },
  { title: 'Informed decisions', description: 'Use available organizational information and reports to support day-to-day decisions.' },
  { title: 'Connected operations', description: 'Link related people, production, inventory, finance, documents, and reporting workflows.' },
  { title: 'Secure access', description: 'Use authenticated accounts and permission-based access across the existing platform.' },
]);

export const supportedOrganizationTypes = Object.freeze([
  { title: 'Cooperatives', description: 'Organization management designed for cooperative operations.' },
  { title: 'Farmer Groups', description: 'Digital support for groups coordinating agricultural activity.' },
  { title: 'Associations', description: 'Structured records and workflows for association management.' },
  { title: 'Small Businesses', description: 'Practical management tools for registered small and medium enterprises.' },
  { title: 'Nonprofits', description: 'Organization-aware tools suited to nonprofit operating contexts.' },
  { title: 'Schools', description: 'Organization support categories already available in the platform.' },
]);

export const landingNav = Object.freeze([
  { key: 'home', href: '#home' },
  { key: 'about', href: '#about' },
  { key: 'services', href: '#services' },
  { key: 'agribridge', href: '#agribridge' },
  { key: 'team', href: '#team' },
  { key: 'testimonials', href: '#testimonials' },
  { key: 'contact', href: '#contact' },
]);
