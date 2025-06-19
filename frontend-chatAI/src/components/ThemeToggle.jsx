import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="fixed top-2.5 right-11 z-[9999] md:z-50 bg-white dark:bg-gray-900 text-gray-800 dark:text-white  border-gray-300 dark:border-gray-700 px-3 py-2 rounded-full  transition-all duration-300 hover:scale-105 md:right-1"
      aria-label="Toggle Theme"
    >
      {darkMode ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
