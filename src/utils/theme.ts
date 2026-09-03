export function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('trill_theme');
  if (saved) return saved === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
    localStorage.setItem('trill_theme', 'dark');
  } else {
    root.classList.remove('dark');
    localStorage.setItem('trill_theme', 'light');
  }
}
