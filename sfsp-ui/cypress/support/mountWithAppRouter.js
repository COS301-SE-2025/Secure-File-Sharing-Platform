import React from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { mount } from 'cypress/react';

export function createMockAppRouter(overrides = {}) {
  return {
    push: cy.stub().as('routerPush'),
    replace: cy.stub(),
    forward: cy.stub(),
    back: cy.stub(),
    prefetch: cy.stub().resolves(),
    refresh: cy.stub(),
    pathname: '/',
    query: {},
    asPath: '/',
    ...overrides,
  };
}

export default function mountWithAppRouter(children, routerOverrides = {}) {
  const mockRouter = createMockAppRouter(routerOverrides);
  return mount(
    <AppRouterContext.Provider value={mockRouter}>
      {children}
    </AppRouterContext.Provider>
  );
}