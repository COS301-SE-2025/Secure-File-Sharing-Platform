/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // enable dark mode with the 'dark' class
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",  // Adjust paths to where your components/pages live
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

