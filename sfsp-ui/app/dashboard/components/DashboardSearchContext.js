'use client';
import { createContext, useContext, useState } from 'react';

const DashboardSearchContext = createContext();

export function DashboardSearchProvider({ children }) {
  const [search, setSearch] = useState('');
  return (
    <DashboardSearchContext.Provider value={{ search, setSearch }}>
      {children}
    </DashboardSearchContext.Provider>
  );
}

export function useDashboardSearch() {
  return useContext(DashboardSearchContext);
}

export { DashboardSearchContext };