import React from 'react';
import { mount } from 'cypress/react';
import { ActionButtons } from '../../app/dashboard/components/ActionButtons';

describe('ActionButtons component', () => {
    beforeEach(() => {
        mount(<ActionButtons />);
    });

    it('renders bell notification area', () => {
        cy.get('svg').should('exist');
    });

    it('renders theme toggle button', () => {
        cy.get('button[title="Toggle theme"]').should('exist');
        cy.get('button[title="Toggle theme"] svg').should('exist');
    });

    it('toggles theme icon on click', () => {
        cy.get('button[title="Toggle theme"]').click();
        cy.get('button[title="Toggle theme"] svg').should('exist');
    });
});