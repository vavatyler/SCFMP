const SUBSCRIPTION_PLANS = Object.freeze([
  {
    id: 'free_trial',
    rank: 0,
    name: 'Free / Trial',
    description: 'A starting plan for evaluating AgriBridge.',
    prices: { monthly: null, yearly: null, currency: null },
  },
  {
    id: 'basic',
    rank: 1,
    name: 'Basic',
    description: 'Core organization, farmer, and record management.',
    prices: { monthly: null, yearly: null, currency: null },
  },
  {
    id: 'professional',
    rank: 2,
    name: 'Professional',
    description: 'Expanded production, document, reporting, and team workflows.',
    prices: { monthly: null, yearly: null, currency: null },
  },
  {
    id: 'enterprise',
    rank: 3,
    name: 'Enterprise',
    description: 'Configurable support for larger and multi-organization operations.',
    prices: { monthly: null, yearly: null, currency: null },
  },
]);

const BILLING_CYCLES = Object.freeze(['monthly', 'yearly']);
const YEARLY_DISCOUNT_GUIDANCE = Object.freeze({ minimum_percent: 15, maximum_percent: 20 });

module.exports = { SUBSCRIPTION_PLANS, BILLING_CYCLES, YEARLY_DISCOUNT_GUIDANCE };
