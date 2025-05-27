import React from 'react';
import { mount } from 'cypress/react';
import { ActionButtons } from '../../app/dashboard/components/ActionButtons'; 

describe('ActionButtons component', () => {
    beforeEach(() => {
        mount(<ActionButtons />);
    });

    it('renders bell button with red dot and new button', () => {
        cy.get('button.relative.w-10.h-10.rounded-full.bg-gray-200').should('exist').within(() => {
            cy.get('svg').should('exist'); 
            cy.get('span').should('have.class', 'bg-red-500'); 
        });

        cy.get('button.bg-blue-600.text-white')
            .contains('+ New')
            .should('exist');
    });

    it('toggles dropdown menu when clicking + New button', () => {
        cy.get('div[role="menu"]').should('not.exist');

        cy.contains('+ New').click();

        cy.get('div.transition-all').should('have.class', 'opacity-100');

        cy.contains('Upload File').should('be.visible');
        cy.contains('Upload Folder').should('be.visible');
        cy.contains('New Document').should('be.visible');
        cy.contains('New Folder').should('be.visible');

        cy.contains('+ New').click();

        cy.get('div.transition-all').should('have.class', 'opacity-0');
    });

    it('closes dropdown when clicking outside', () => {
        cy.contains('+ New').click();
        cy.get('div.transition-all').should('have.class', 'opacity-100');

        cy.get('body').click(0, 0);

        cy.get('div.transition-all').should('have.class', 'opacity-0');
    });
});
