import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setWebhookUrl(localStorage.getItem('ecomind_webhook_url') || '');
      setApiKey(localStorage.getItem('ecomind_gemini_key') || '');
    }
  }, [isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('ecomind_webhook_url', webhookUrl);
    localStorage.setItem('ecomind_gemini_key', apiKey);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-organic-ink/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl p-6 w-11/12 max-w-md shadow-xl z-50 border border-organic-ink/10"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif text-2xl text-organic-ink">Systemic Configuration</h2>
              <button onClick={onClose} className="p-2 -mr-2 text-organic-ink/50 hover:text-organic-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-organic-ink/60">
                  Google Sheets Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-organic-bg/50 border border-organic-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-organic-olive"
                />
                <p className="text-[10px] text-organic-ink/40">
                  Overrides the environment default for interaction logging.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-organic-ink/60">
                  Gemini API Key (Optional Override)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-organic-bg/50 border border-organic-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-organic-olive"
                />
                <p className="text-[10px] text-organic-ink/40">
                  Bypasses the default server-side key for custom access.
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-organic-olive text-white px-6 py-2.5 rounded-full text-sm hover:bg-organic-olive/90 transition-colors"
                >
                  Apply Configuration
                </button>
              </div>
            </form>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
};
