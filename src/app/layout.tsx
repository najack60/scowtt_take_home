import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movie Notes",
  description: "A little trivia about the movies you love.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
