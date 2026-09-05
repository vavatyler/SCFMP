const STATUS_STYLES = {
  active: 'bg-forest/10 text-forest',
  inactive: 'bg-ink-soft/10 text-ink-soft',
  suspended: 'bg-clay/10 text-clay',
  recorded: 'bg-gold/15 text-gold-dark',
  verified: 'bg-forest/10 text-forest',
  rejected: 'bg-clay/10 text-clay',
  expiring_soon: 'bg-gold/15 text-gold-dark',
  expired: 'bg-clay/10 text-clay',
  archived: 'bg-ink-soft/10 text-ink-soft',
  trialing: 'bg-gold/15 text-gold-dark',
  past_due: 'bg-clay/10 text-clay',
  cancelled: 'bg-ink-soft/10 text-ink-soft',
};

const Badge = ({ status, children }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
      STATUS_STYLES[status] || STATUS_STYLES.inactive
    }`}
  >
    {children || status}
  </span>
);

export default Badge;
