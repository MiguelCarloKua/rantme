// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RantMe',
  description: 'Vent your academic frustrations anonymously.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className="min-h-screen bg-[#f7f7f8] text-gray-800 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
