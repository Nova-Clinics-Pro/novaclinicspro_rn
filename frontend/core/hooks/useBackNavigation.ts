import { Href, useRouter } from 'expo-router';

/** One shared Back rule: preserve history; use a governed fallback for direct links. */
export const useBackNavigation = (fallback: Href) => {
  const router = useRouter();
  return () => { if (router.canGoBack()) router.back(); else router.replace(fallback); };
};
