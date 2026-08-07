import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { appSettingsService } from '../services/appSettingsService';
import { AppSettings } from '../types';
import {
  applyCrmCssVariables,
  buildCrmGradients,
  createCrmMuiTheme,
  CrmAppearanceSettings,
  CrmColorTokens,
  CrmGradientTokens,
  resolveAppearanceFromSettings,
  resolveCrmAppearance,
  SETTINGS_PREVIEW_EVENT,
} from '../utils/crmAppearance';

interface CrmThemeContextValue {
  appearance: CrmAppearanceSettings;
  colors: CrmColorTokens;
  gradients: CrmGradientTokens;
}

const CrmThemeContext = createContext<CrmThemeContextValue | null>(null);

const SETTINGS_UPDATED_EVENT = 'crm:settings-updated';

export const CrmThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => appSettingsService.getSettings());
  const [previewAppearance, setPreviewAppearance] = useState<CrmAppearanceSettings | null>(null);

  useEffect(() => {
    const syncWorkspaceSettings = () => {
      if (!localStorage.getItem('token')) {
        return;
      }

      void appSettingsService.refreshFromApi();
    };

    syncWorkspaceSettings();

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<AppSettings>).detail;
      if (detail) {
        setSettings(detail);
        setPreviewAppearance(resolveAppearanceFromSettings(detail));
      }
    };

    const handlePreview = (event: Event) => {
      const detail = (event as CustomEvent<CrmAppearanceSettings>).detail;
      if (detail) {
        setPreviewAppearance(detail);
      }
    };

    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
    window.addEventListener(SETTINGS_PREVIEW_EVENT, handlePreview as EventListener);
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
      window.removeEventListener(SETTINGS_PREVIEW_EVENT, handlePreview as EventListener);
    };
  }, []);

  const appearance = useMemo(
    () => previewAppearance ?? resolveAppearanceFromSettings(settings),
    [previewAppearance, settings.appearance, settings.system?.theme]
  );
  const colors = useMemo(() => resolveCrmAppearance(appearance), [appearance]);
  const gradients = useMemo(() => buildCrmGradients(colors), [colors]);
  const theme = useMemo(() => createCrmMuiTheme(appearance), [appearance]);

  useEffect(() => {
    applyCrmCssVariables(appearance);
  }, [appearance]);

  const value = useMemo(
    () => ({
      appearance,
      colors,
      gradients,
    }),
    [appearance, colors, gradients]
  );

  return (
    <CrmThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CrmThemeContext.Provider>
  );
};

export const useCrmAppearance = () => {
  const context = useContext(CrmThemeContext);
  if (!context) {
    throw new Error('useCrmAppearance must be used within CrmThemeProvider');
  }

  return context;
};
