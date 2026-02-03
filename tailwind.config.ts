import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.tsx',
    './src/**/*.ts',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['HarmonyOS Sans SC', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '12px'],
        '3xs': ['9px', '11px'],
      },
    },
  },
  plugins: [],
} satisfies Config

