/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
    "./docs/**/*.md",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
