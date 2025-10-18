export function isValidEmail(v: string): boolean {
    // strict enough for UI; not overkill
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  }
  
  export function normalizePhone(v: string): string {
    // keep leading +; strip non-digits otherwise
    const trimmed = v.trim();
    if (trimmed.startsWith('+')) {
      const only = '+' + trimmed.slice(1).replace(/\D/g, '');
      return only;
    }
    return trimmed.replace(/\D/g, '');
  }
  
  export function isValidPhone(v: string): boolean {
    const n = normalizePhone(v);
    // accept +E.164 (8-15 digits after +) or 10 digits for US-like numbers
    if (n.startsWith('+')) return /^\+\d{8,15}$/.test(n);
    return /^\d{10}$/.test(n);
  }
  