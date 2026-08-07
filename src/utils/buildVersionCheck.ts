const BUILD_VERSION_KEY = 'crm_build_id';
const BUILD_RELOAD_KEY = 'crm_build_reload';

type BuildVersionPayload = {
  id: string;
  mainBundle: string;
};

export const ensureFreshBuild = async (): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const response = await fetch(`/build-version.json?_=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as BuildVersionPayload;
    const buildId = String(payload.id || '').trim();
    if (!buildId) {
      return;
    }

    const storedBuildId = sessionStorage.getItem(BUILD_VERSION_KEY);
    const alreadyReloaded = sessionStorage.getItem(BUILD_RELOAD_KEY) === buildId;

    if (storedBuildId && storedBuildId !== buildId && !alreadyReloaded) {
      sessionStorage.setItem(BUILD_VERSION_KEY, buildId);
      sessionStorage.setItem(BUILD_RELOAD_KEY, buildId);

      const url = new URL(window.location.href);
      url.searchParams.set('_v', buildId);
      window.location.replace(url.toString());
      await new Promise<void>(() => {});
    }

    sessionStorage.setItem(BUILD_VERSION_KEY, buildId);
    sessionStorage.removeItem('crm_chunk_reload_once');
  } catch {
    // Offline or missing build-version.json — continue with the loaded bundle.
  }
};
