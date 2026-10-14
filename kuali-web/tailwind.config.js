/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#131314', // Fondo base característico de Google AI Studio
          surface: '#1e1f20', // Contenedores / Tarjetas
          surfaceHover: '#282a2c',
          border: '#333538', // Bordes sutiles
          borderLight: '#444746',
          textMuted: '#8e918f',
          accent: '#7cacf8', // Azul insignia de Gemini
          accentDark: '#1b3a57',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
