import React from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';

const mockRouter = {
    push: () => {},
    replace: () => {},
    prefetch: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    pathname: '/dashboard',
};

export function AppRouterMockProvider({ children }) {
    return (
        <AppRouterContext.Provider value={mockRouter}>
        {children}
        </AppRouterContext.Provider>
    );
}