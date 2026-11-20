import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Admin Control Center | Rajeshwar Pooja Samagri',
  description: 'Authorized store management, inventory control, and courier fulfillment portal.',
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
