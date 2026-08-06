import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';
import { useCooperative } from '../context/CooperativeContext';

const CooperativeSwitcher = () => {
  const { cooperatives, activeCooperativeId, activeCooperative, setActiveCooperativeId, isSuperAdmin } =
    useCooperative();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isSuperAdmin) return null;

  if (cooperatives.length === 0) {
    return <p className="text-sm text-ink-soft">No cooperatives yet</p>;
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="focus-ring flex items-center gap-2 rounded-lg border border-sand bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-sand/30"
      >
        <Building2 className="h-3.5 w-3.5 text-ink-soft" />
        <span className="max-w-[180px] truncate">
          {activeCooperative ? activeCooperative.name : 'Select cooperative'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-soft" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 z-40 mt-2 w-64 rounded-xl border border-sand bg-white py-1.5 shadow-2xl">
            {cooperatives.map((coop) => (
              <button
                key={coop.id}
                onClick={() => {
                  setActiveCooperativeId(coop.id);
                  setIsOpen(false);
                }}
                className="focus-ring flex w-full items-center justify-between px-4 py-2 text-left text-sm text-ink hover:bg-sand/30"
              >
                <span className="truncate">{coop.name}</span>
                {coop.id === activeCooperativeId && <Check className="h-3.5 w-3.5 shrink-0 text-forest" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CooperativeSwitcher;
