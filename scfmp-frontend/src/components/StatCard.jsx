const ACCENT_CLASSES = {
  forest: 'bg-forest',
  gold: 'bg-gold',
  clay: 'bg-clay',
};

const StatCard = ({ label, value, sublabel, accent = 'forest', isCurrency = false }) => {
  const formattedValue = isCurrency
    ? `${Number(value).toLocaleString('en-RW')} RWF`
    : Number(value).toLocaleString('en-RW');

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-card">
      <div className={`h-1 w-full ${ACCENT_CLASSES[accent]}`} />
      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
        <p className="figure mt-2 text-2xl font-semibold text-ink">{formattedValue}</p>
        {sublabel && <p className="mt-1 text-xs text-ink-soft">{sublabel}</p>}
      </div>
    </div>
  );
};

export default StatCard;
