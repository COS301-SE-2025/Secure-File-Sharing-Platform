import React from 'react';
import HelpCenter from '../../app/Support/helpCenter/page';
import { AppRouterMockProvider } from '../support/AppRouterMockProvider';

describe('HelpCenter Component', () => {
  beforeEach(() => {
    cy.viewport('macbook-15');

    cy.mount(
      <AppRouterMockProvider>
        <HelpCenter />
      </AppRouterMockProvider>
    );
  });

  it('renders the header section correctly', () => {
    cy.get('h1').contains('Help Center').should('be.visible');
    cy.get('p').contains('Welcome to the Help Center').should('be.visible');
  });

  it('toggles accordion sections on click (desktop view)', () => {
    cy.viewport('macbook-15');

    cy.get('button').contains('File Management').click();
    cy.get('div').contains('How to upload files securely').should('be.visible');

    cy.get('button').contains('File Management').click();
    cy.get('div').contains('How to upload files securely').should('not.be.visible');
  });

  it('verifies quick stats section', () => {
    cy.get('div').contains('50+ Articles').should('be.visible');
    cy.get('div').contains('2 hours').should('be.visible');
    cy.get('div').contains('98.5%').should('be.visible');
  });

  it('checks FAQ and Contact links', () => {
    cy.contains('a', 'View FAQs').should('have.attr', 'href', '/Support/FAQs');
    cy.contains('a', 'Contact Support').should('have.attr', 'href', '/Support/contactPage');
  });

  it('verifies image is rendered', () => {
    cy.get('img[alt="Help Center Support"]').should('be.visible');
  });
});
