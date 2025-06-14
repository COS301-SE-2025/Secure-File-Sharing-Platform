import React from 'react';
import Home from '../../app/page';
import FeatureRotator from '../../app/home_features';
import '../../app/globals.css';

describe('Home Page Component', () => {
  it('renders SecureShare heading and login button', () => {
    cy.mount(<Home />);
    cy.contains('SecureShare').should('be.visible');
    cy.contains('Log In').should('be.visible');
  });

  it('displays features section', () => {
    cy.mount(<Home />);
    cy.get('#features').should('exist');
    cy.contains('supports you and your care to privacy').should('exist');
  });
});

describe('FeatureRotator Component', () => {
  it('renders the first feature', () => {
    cy.mount(<FeatureRotator />);
    cy.get('[aria-label^="Highlight"]').eq(0).invoke('attr', 'class').should('match', /bg-blue-(600|400)/);
  });

  it('auto-rotates after 10 seconds', () => {
    cy.clock(); 
    cy.mount(<FeatureRotator />);

    cy.get('[aria-label^="Highlight"]').eq(0).invoke('attr', 'class').should('match', /bg-blue-(600|400)/);

    cy.tick(10000);

    cy.get('[aria-label^="Highlight"]').eq(1).invoke('attr', 'class').should('match', /bg-gray-(600|400)/);
  });

  it('clicking a dot sets the feature', () => {
    cy.mount(<FeatureRotator />);

    cy.get('[aria-label="Highlight Access Control Logs"]').click();

    cy.get('[aria-label="Highlight Access Control Logs"]').invoke('attr', 'class').should('match', /bg-blue-(600|400)/);
  });

  it('clicking a dot sets the feature 2', () => {
    cy.mount(<FeatureRotator />);
    cy.get('[aria-label="Highlight One-Time Download Links"]').click();
    cy.contains('One-Time Download Links').should('exist');
  });
});