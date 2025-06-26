import React from 'react';
import { mount } from 'cypress/react';
import { DashboardSearchProvider, useDashboardSearch } from '../../app/dashboard/components/DashboardSearchContext';

function TestComponent() {
  const { search, setSearch } = useDashboardSearch();

  return (
    <div>
      <input
        data-testid="search-input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
      />
      <p data-testid="search-value">{search}</p>
    </div>
  );
}

describe('DashboardSearchContext', () => {
  it('provides and updates search', () => {
    mount(
      <DashboardSearchProvider>
        <TestComponent />
      </DashboardSearchProvider>
    );

    cy.get('[data-testid="search-input"]')
      .should('have.value', '')
      .type('hello');

    cy.get('[data-testid="search-input"]').should('have.value', 'hello');
    cy.get('[data-testid="search-value"]').should('contain.text', 'hello');
  });

  it('useDashboardSearch throws if used outside provider', () => {
    function BrokenComponent() {
      const ctx = useDashboardSearch();
      return <div>{ctx.search}</div>;
    }

    cy.on('uncaught:exception', (err) => {
      expect(err.message).to.include('Cannot read properties of undefined');
      return false;
    });

    mount(<BrokenComponent />);
  });
});