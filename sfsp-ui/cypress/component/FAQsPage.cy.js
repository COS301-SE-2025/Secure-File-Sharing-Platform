// cypress/component/FAQsPage.cy.js
import React from 'react';
import FAQsPage from '../../app/Support/FAQs/page';
import '../../app/globals.css';

import { AppRouterMockProvider } from '../support/AppRouterMockProvider';

describe('FAQsPage Component', () => {
    beforeEach(() => {
        cy.mount(
        <AppRouterMockProvider>
            <FAQsPage />
        </AppRouterMockProvider>
        );
    });

    it('renders FAQ header', () => {
        cy.contains('Frequently Asked Questions').should('be.visible');
    });

    // it('displays search input and filters FAQs', () => {
    //     cy.get('input[placeholder*="Search FAQs"]').should('be.visible').type('encryption');
    //     cy.contains('How is my data protected?').should('be.visible');
    //     cy.contains('What is the Secure File Sharing Platform?').should('not.exist');
    // });

    it('shows total FAQ count', () => {
        cy.contains('Total FAQs').should('be.visible');
        cy.contains('10').should('be.visible');
    });

    it('shows carousel navigation buttons and slides content', () => {
        cy.contains('Browse FAQs').should('be.visible');
        cy.get('button').contains('Next').click();
        cy.wait(1000);
        cy.get('button').contains('Previous').click();
    });

    it('displays tags in each slide', () => {
        cy.get('span').contains('Platform').should('exist');
    });

    it('shows support card with contact button', () => {
        cy.get('a[href="/Support/contactPage"]')
        .should('be.visible')
        .contains('Contact Support');
    });
});
