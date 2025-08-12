export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/**/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/App.jsx", // Explicitly include
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
