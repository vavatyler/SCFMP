import { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Drop-in replacement for <input type="password">. Pass the exact same
 * className you'd give a plain <input> — this component appends pr-10
 * to make room for the toggle icon rather than imposing its own base
 * styles, so it never fights with each page's existing input classes.
 */
const PasswordInput = forwardRef(({ className = '', ...props }, ref) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={isVisible ? 'text' : 'password'}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={() => setIsVisible((v) => !v)}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
        className="focus-ring absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-soft hover:text-ink"
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
