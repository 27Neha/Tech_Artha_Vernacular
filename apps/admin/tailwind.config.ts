import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3C3985",
          light: "#EBEBFA",
          dark: "#2A2761",
          hover: "#4D49A0",
        },
        accent: {
          DEFAULT: "#F7941E",
          light: "#FFF4E8",
          dark: "#D67B0F",
        },
        canvas: "#F8F9FB",
        navy: {
          900: "#102A54",
          800: "#1E3A6D",
          700: "#2B4C85",
        },
      },
    },
  },
  plugins: [],
};
export default config;
