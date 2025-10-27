import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AppStateContext = createContext({
  refreshToken: 0,
  refreshAll: () => {},
});

export function AppStateProvider({ children }) {
  const [refreshToken, setRefreshToken] = useState(0);

  const refreshAll = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const value = useMemo(
    () => ({
      refreshToken,
      refreshAll,
    }),
    [refreshToken, refreshAll]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  return useContext(AppStateContext);
}
