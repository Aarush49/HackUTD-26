import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { ink: "#0B3A5B", sky: "#38BDF8", pink: "#FF2E93" },
    fontFamily: { sans: ["Inter Variable", "sans-serif"], display: ["Fraunces Variable", "serif"] },
    boxShadow: { glass: "0 18px 50px rgba(14, 116, 144, .13)" }
  } },
  plugins: []
} satisfies Config;
