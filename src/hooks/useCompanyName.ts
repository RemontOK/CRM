import { useEffect, useState } from 'react';
import { appSettingsService } from '../services/appSettingsService';
import { useAuth } from './useAuth';

const SETTINGS_UPDATED_EVENT = 'crm:settings-updated';

export const getCompanyDisplayName = (
  companyName?: string,
  tenantName?: string,
  fallback = 'Сервисный центр'
) => companyName?.trim() || tenantName?.trim() || fallback;

export const useCompanyName = (fallback = 'Сервисный центр') => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState(() =>
    getCompanyDisplayName(
      appSettingsService.getSettings().business.companyName,
      user?.tenant?.name,
      fallback
    )
  );

  useEffect(() => {
    const sync = (event?: Event) => {
      const detail = (event as CustomEvent | undefined)?.detail;
      const settings = detail || appSettingsService.getSettings();
      setCompanyName(
        getCompanyDisplayName(settings.business?.companyName, user?.tenant?.name, fallback)
      );
    };

    window.addEventListener(SETTINGS_UPDATED_EVENT, sync as EventListener);
    sync();

    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, sync as EventListener);
    };
  }, [fallback, user?.tenant?.name]);

  return companyName;
};
