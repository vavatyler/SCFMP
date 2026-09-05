const { Subscription } = require('../models');
const { SUBSCRIPTION_PLANS, YEARLY_DISCOUNT_GUIDANCE } = require('../config/subscriptionPlans');

const getOverview = async (req, res) => {
  try {
    const cooperativeId = req.user.role === 'super_admin'
      ? Number(req.query.cooperative_id || 0) || null
      : req.user.cooperative_id;
    const current = cooperativeId
      ? await Subscription.findOne({ where: { cooperative_id: cooperativeId } })
      : null;
    return res.status(200).json({
      success: true,
      data: {
        current,
        plans: SUBSCRIPTION_PLANS,
        yearly_discount_guidance: YEARLY_DISCOUNT_GUIDANCE,
        history: [],
        invoices: [],
        billing_provider_configured: false,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getOverview };
