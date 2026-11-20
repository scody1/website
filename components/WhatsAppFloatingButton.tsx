'use client';

import React from 'react';
import { useStore } from '@/lib/storeContext';
import { formatWhatsAppUrl } from '@/lib/formatters';
import { MessageCircle } from 'lucide-react';

export default function WhatsAppFloatingButton() {
  const { state } = useStore();

  const phone = state.storeConfig.whatsapp || state.storeConfig.supportPhone || '';
  const greeting = state.storeConfig.whatsappGreeting ||
    'Namaste Rajeshwar Pooja Samagri! I would like to inquire about your Sacred Pooja Essentials.';

  const whatsappUrl = formatWhatsAppUrl(phone, greeting);
  const hasPhone = whatsappUrl !== '#';

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40">
      <a
        href={hasPhone ? whatsappUrl : '#'}
        onClick={(e) => {
          if (!hasPhone) {
            e.preventDefault();
            alert('WhatsApp support is currently unavailable. Please reach us via our support helpline or email.');
          }
        }}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 group border-2 border-white/80"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="w-5 h-5 fill-white" />
        <span className="hidden sm:inline text-xs font-bold tracking-wide">
          Chat with Devotional Support
        </span>
      </a>
    </div>
  );
}
