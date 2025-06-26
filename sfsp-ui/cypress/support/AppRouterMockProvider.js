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
    route: '/',
    basePath: '',
    query: {},
    events: {
        on: () => {},
        off: () => {},
        emit: () => {},
    },
    isFallback: false,
    isReady: true,
    isPreview: false,
};

export function AppRouterMockProvider({ children }) {
    return (
        <AppRouterContext.Provider value={mockRouter}>
        {children}
        </AppRouterContext.Provider>
    );
}