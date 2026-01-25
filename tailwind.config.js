/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Outfit', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        'heading': ['Cormorant Garamond', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        'body': ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // --- DYNAMIC THEME BRIDGE ---
        // These map semantic classes to CSS variables injected by LayoutPreview
        // The fallback values are used when CSS vars are not set (non-generated UI)
        // AI-generated layouts use: bg-primary, text-text, border-border, etc.
        'primary': 'var(--primary, #2ECC71)',
        'secondary': 'var(--secondary, #C9A227)',
        'accent': 'var(--accent, #FFB8CA)',
        'background': 'var(--background, #F6F9F2)',
        'surface': 'var(--surface, #FEFCF8)',
        'text': 'var(--text, #1A3D26)',
        'text-muted': 'var(--text-muted, #5A7D64)',
        'border': 'var(--border, #E6ECDF)',

        // Garden green palette
        garden: {
          50: '#F6F9F2',
          100: '#F0F5EC',
          200: '#E6ECDF',
          300: '#D4DEC8',
          400: '#8FC99A',
          500: '#7FB285',
          600: '#4A9B5F',
          700: '#2ECC71',
          800: '#1D6F42',
          900: '#1A3D26',
          950: '#0B1A10',
        },

        // Gold palette
        gold: {
          50: '#FBF5E6',
          100: '#F5ECD0',
          200: '#E8D48B',
          300: '#D4AF37',
          400: '#C9A227',
          500: '#B8922A',
          600: '#9A7A22',
          700: '#7C621B',
          800: '#5E4A14',
          900: '#40320D',
        },

        // Blossom/pink accent
        blossom: {
          50: '#FFF5F7',
          100: '#FADCE6',
          200: '#FFB8CA',
          300: '#E89AAD',
          400: '#C06C84',
          500: '#A85A6F',
          600: '#8A4859',
          700: '#6C3644',
          800: '#4E242F',
          900: '#30121A',
        },

        // Surface layers for UI hierarchy - Light mode defaults
        surface: {
          DEFAULT: '#F6F9F2',
          elevated: '#FEFCF8',
          overlay: '#F0F5EC',
          border: '#E6ECDF',
        },

        // Garden-inspired color palette (replaces linear)
        linear: {
          bg: '#F6F9F2',
          'bg-elevated': '#FEFCF8',
          'bg-hover': '#F0F5EC',
          'bg-subtle': '#E6ECDF',
          border: '#E6ECDF',
          'border-subtle': '#D4DEC8',
          text: '#1A3D26',
          'text-secondary': '#5A7D64',
          'text-muted': '#8BA895',
          accent: '#2ECC71',
          'accent-hover': '#1D6F42',
        },

        // Semantic colors - garden themed
        success: {
          50: '#F6F9F2',
          100: '#F0F5EC',
          200: '#D4DEC8',
          300: '#8FC99A',
          400: '#4A9B5F',
          500: '#2ECC71',
          600: '#1D6F42',
          700: '#1A5A38',
          800: '#16472D',
          900: '#123422',
        },
        warning: {
          50: '#FBF5E6',
          100: '#F5ECD0',
          200: '#E8D48B',
          300: '#D4AF37',
          400: '#C9A227',
          500: '#B8922A',
          600: '#9A7A22',
          700: '#7C621B',
          800: '#5E4A14',
          900: '#40320D',
        },
        error: {
          50: '#FFF5F7',
          100: '#FADCE6',
          200: '#FFB8CA',
          300: '#E89AAD',
          400: '#C06C84',
          500: '#A85A6F',
          600: '#8A4859',
          700: '#6C3644',
          800: '#4E242F',
          900: '#30121A',
        },

        // Glass/transparency utilities
        glass: {
          light: 'rgba(46, 204, 113, 0.1)',
          medium: 'rgba(46, 204, 113, 0.2)',
          heavy: 'rgba(46, 204, 113, 0.3)',
        },
      },
      // Extended spacing scale
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
        '42': '10.5rem',
        '50': '12.5rem',
        '58': '14.5rem',
        '66': '16.5rem',
        '74': '18.5rem',
        '82': '20.5rem',
        '90': '22.5rem',
        '128': '32rem',
        '144': '36rem',
      },
      // Typography extensions
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.16' }],
        '6xl': ['3.75rem', { lineHeight: '1.1' }],
        '7xl': ['4.5rem', { lineHeight: '1.05' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      // Custom box shadows - Garden themed
      boxShadow: {
        'inner-sm': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'inner-md': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.1)',
        // Green glows for primary actions
        'glow-sm': '0 0 10px rgba(46, 204, 113, 0.3)',
        'glow-md': '0 0 20px rgba(46, 204, 113, 0.4)',
        'glow-lg': '0 0 30px rgba(46, 204, 113, 0.5)',
        // Gold glow for secondary/premium
        'glow-gold': '0 0 20px rgba(201, 162, 39, 0.4)',
        // Blossom glow for accents
        'glow-blossom': '0 0 20px rgba(192, 108, 132, 0.4)',
        // Keep green alias
        'glow-green': '0 0 20px rgba(46, 204, 113, 0.4)',
        // Soft garden shadows (light mode)
        'garden-sm': '0 2px 8px -2px rgba(26, 61, 38, 0.08)',
        'garden-md': '0 4px 16px -4px rgba(26, 61, 38, 0.12)',
        'garden-lg': '0 8px 32px -8px rgba(26, 61, 38, 0.16)',
        // Elevated shadows
        'elevated-sm': '0 2px 8px -2px rgba(26, 61, 38, 0.08), 0 2px 4px -2px rgba(26, 61, 38, 0.04)',
        'elevated-md': '0 4px 16px -4px rgba(26, 61, 38, 0.12), 0 2px 8px -2px rgba(26, 61, 38, 0.08)',
        'elevated-lg': '0 8px 32px -8px rgba(26, 61, 38, 0.16), 0 4px 16px -4px rgba(26, 61, 38, 0.12)',
        // Button shadows
        'btn': '0 1px 2px 0 rgba(26, 61, 38, 0.05)',
        'btn-hover': '0 1px 3px 0 rgba(26, 61, 38, 0.1)',
      },
      // Backdrop blur extensions
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
      // Border radius extensions - Garden theme uses 12-20px rounded corners
      borderRadius: {
        'garden': '12px',
        'garden-lg': '16px',
        'garden-xl': '20px',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      // Z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        'dropdown': '1000',
        'sticky': '1020',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },
      // Transition timing functions
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      // Screen breakpoints
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(46, 204, 113, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(46, 204, 113, 0.8)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(46, 204, 113, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(46, 204, 113, 0.8)' }
        },
        // Gold glow animation
        glowGold: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(201, 162, 39, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(201, 162, 39, 0.8)' },
        }
      },
      animation: {
        'fadeIn': 'fadeIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'slide-in-left': 'slideInLeft 0.2s ease-out',
        'slide-in-up': 'slideInUp 0.2s ease-out',
        'slide-in-down': 'slideInDown 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'bounce-soft': 'bounceSoft 1s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'glow-gold': 'glowGold 2s ease-in-out infinite'
      }
    },
  },
  plugins: [],
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
}
