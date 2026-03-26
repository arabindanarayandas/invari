/**
 * PostCSS Configuration
 * Production-grade CSS processing with optimizations
 */

export default {
  plugins: {
    // Tailwind CSS v4 PostCSS plugin
    '@tailwindcss/postcss': {},

    // Autoprefixer for browser compatibility
    autoprefixer: {
      flexbox: 'no-2009',
      grid: 'autoplace',
    },
  },
}