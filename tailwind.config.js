
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mint: "#3eb489",
        navy1: "#0a192f",
        navy2: "#0f2d4a",
        cardbg: "#102a43",
        cardborder: "#1d3b53",
      },
      boxShadow: {
        soft: "0 10px 25px rgba(0,0,0,0.25)"
      },
      borderRadius: {
        "2xl": "1rem"
      }
    },
  },
  plugins: [],
}
