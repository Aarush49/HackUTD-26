import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Canopy — See what your money can weather", description: "A synthetic personal finance planning demo" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
