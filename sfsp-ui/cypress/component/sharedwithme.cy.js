import React, { useState } from 'react';
import SharedWithMePage from '../../app/dashboard/sharedWithMe/page';
import { DashboardSearchContext } from '../../app/dashboard/components/DashboardSearchContext';
import mountWithAppRouter from '../support/mountWithAppRouter';

describe('SharedWithMePage Component', () => {
  function DashboardSearchProviderWrapper({ children }) {
    const [search, setSearch] = useState('');
    return (
      <DashboardSearchContext.Provider value={{ search, setSearch }}>
        {children}
      </DashboardSearchContext.Provider>
    );
  }

  beforeEach(() => {
    mountWithAppRouter(
      <DashboardSearchProviderWrapper>
        <SharedWithMePage />
      </DashboardSearchProviderWrapper>
    );
  });

  it('renders heading and description', () => {
    cy.contains('h1', 'Shared with me').should('be.visible');
    cy.contains('Files and folders that have been shared with you').should('be.visible');
  });

  it('shows files in grid view by default', () => {
    cy.get('div.grid').should('exist');
    cy.contains('Strategy.docx').should('be.visible');
    cy.contains('Roadmap.xlsx').should('be.visible');
  });

  it('switches to list view when clicking list button', () => {
    cy.get('button').eq(1).click();
    cy.contains('Presentation.pptx').should('be.visible');
  });

  it('filters files based on search input', () => {

    function ControlledSearchWrapper() {
      const [search, setSearch] = useState('');
      return (
        <DashboardSearchContext.Provider value={{ search, setSearch }}>
          <SharedWithMePage />
          <input
            data-cy="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </DashboardSearchContext.Provider>
      );
    }

    mountWithAppRouter(<ControlledSearchWrapper />);

    cy.contains('Strategy.docx').should('be.visible');
    cy.contains('Banner.png').should('be.visible');

    cy.get('[data-cy=search-input]').type('john');

    cy.contains('Strategy.docx').should('be.visible');
    cy.contains('Roadmap.xlsx').should('not.exist');
  });
});
