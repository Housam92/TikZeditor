/**
 * Enhanced theme toggle functionality for light/dark mode.
 * Properly switches between light and dark themes with all CSS variables.
 * Saves user preference to localStorage.
 */
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;

    // light theme colors
    const lightTheme = {
        '--primary': '#0084ff',
        '--primary-hover': '#006dd4',
        '--primary-light': '#e3f2fd',
        '--accent': '#00c6ff',
        '--success': '#10b981',
        '--warning': '#f59e0b',
        '--error': '#ef4444',
        '--text': '#1a1a1a',
        '--text-secondary': '#6b7280',
        '--text-muted': '#9ca3af',
        '--background': '#f8fafc',
        '--surface': '#ffffff',
        '--editor-bg': '#ffffff',
        '--preview-bg': '#fafbfc',
        '--border': '#e5e7eb',
        '--divider': '#d1d5db'
    };

    // dark theme colors
    const darkTheme = {
        '--primary': '#0084ff',
        '--primary-hover': '#006dd4',
        '--primary-light': 'rgba(0, 132, 255, 0.1)',
        '--accent': '#00c6ff',
        '--success': '#10b981',
        '--warning': '#f59e0b',
        '--error': '#ef4444',
        '--text': '#f9fafb',
        '--text-secondary': '#d1d5db',
        '--text-muted': '#9ca3af',
        '--background': '#0f172a',
        '--surface': '#1e293b',
        '--editor-bg': '#1e293b',
        '--preview-bg': '#ffffff',
        '--border': '#334155',
        '--divider': '#475569'
    };

    // check for saved theme preference or default to light
    let isDark = localStorage.getItem('theme') === 'dark';

    // apply theme colors
    function applyTheme(theme) {
        Object.keys(theme).forEach(property => {
            root.style.setProperty(property, theme[property]);
        });
    }

    // initialize theme on load
    if (isDark) {
        applyTheme(darkTheme);
        updateButtonIcon(true);
    } else {
        applyTheme(lightTheme);
        updateButtonIcon(false);
    }

    // update button icon based on theme
    function updateButtonIcon(dark) {
        const icon = themeToggle?.querySelector('.button-icon');
        if (icon) {
            if (dark) {
                icon.className = 'fas fa-sun button-icon'; // sun icon for dark mode 
            } else {
                icon.className = 'fas fa-moon button-icon'; // moon icon for light moode
            }
        }
    }

    // toggle theme on button 
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            isDark = !isDark;

            if (isDark) {
                applyTheme(darkTheme);
                localStorage.setItem('theme', 'dark');
                updateButtonIcon(true);
            } else {
                applyTheme(lightTheme);
                localStorage.setItem('theme', 'light');
                updateButtonIcon(false);
            }

            //      add smooth transition effect
            root.style.transition = 'background 0.3s ease, color 0.3s ease';
            setTimeout(() => {
                root.style.transition = '';
            }, 300);
        });
    }
});