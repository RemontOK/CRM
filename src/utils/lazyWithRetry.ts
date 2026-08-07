import { ComponentType, lazy } from 'react';

export const CHUNK_RELOAD_KEY = 'crm_chunk_reload_once';

export const CHUNK_RELOAD_BLOCKED_MESSAGE =
  'Не удалось загрузить страницу. Закройте все вкладки nakcrm.ru, откройте сайт заново или очистите данные сайта в Chrome.';

export const isChunkLoadError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('loading chunk') ||
    message.includes('mime type') ||
    message.includes('ns_error_corrupted_content') ||
    message.includes('does not provide an export') ||
    message.includes('err_cache') ||
    message.includes('cache') ||
    message.includes('useauth must be used within an authprovider') ||
    message.includes("reading 'usecontext'") ||
    message.includes('minified react error #321') ||
    message.includes('invalid hook call')
  );
};

const reloadOnceForChunkError = async (): Promise<never> => {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') {
    throw new Error(CHUNK_RELOAD_BLOCKED_MESSAGE);
  }

  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  const url = new URL(window.location.href);
  url.searchParams.set('_v', String(Date.now()));
  window.location.replace(url.toString());
  await new Promise<void>(() => {});
  throw new Error(CHUNK_RELOAD_BLOCKED_MESSAGE);
};

export const lazyWithRetry = <T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
) =>
  lazy(async () => {
    try {
      const module = await factory();
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      return module;
    } catch (error) {
      if (isChunkLoadError(error)) {
        return reloadOnceForChunkError();
      }
      throw error;
    }
  });
