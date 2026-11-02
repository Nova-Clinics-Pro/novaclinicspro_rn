import { useState, useRef } from 'react';
import { t } from '../localization';

export function useLogoutConfirmation(logout: () => Promise<void>) {
  const running = useRef(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return {
    requestLogout: () => { setError(null); setVisible(true); },
    error,
    dialog: {
      visible, loading, title: t('confirmations.logout'), message: error || t('confirmations.logout'),
      confirmText: t('navigation.logout'), cancelText: t('common.cancel'),
      onCancel: () => { if (!loading) setVisible(false); },
      onConfirm: async () => {
        if (running.current) return;
        running.current = true;
        setLoading(true); setError(null);
        try { await logout(); setVisible(false); }
        catch { setError(t('errors.auth.logoutFailed')); }
        finally { running.current = false; setLoading(false); }
      },
    },
  };
}
