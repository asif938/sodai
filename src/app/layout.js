import './globals.css';

export const metadata = {
  title: 'সদাই - বাজারের তালিকা',
  description: 'আপনার দৈনন্দিন বাজারের তালিকা সহজে তৈরি করুন',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f1117',
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
