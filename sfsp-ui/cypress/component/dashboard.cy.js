import React from 'react';
import DashboardHomePage from '../../app/dashboard/page';
import '../../app/globals.css';

describe('DashboardHomePage Component', () => {
    it('renders the welcome heading and subtitle', () => {
        cy.mount(<DashboardHomePage />);
        cy.contains('Welcome!').should('be.visible');
        cy.contains("Here's a quick look at your file sharing activity.").should('be.visible');
    });

    it('renders all four stat cards with correct labels and values', () => {
        cy.mount(<DashboardHomePage />);

        const expectedStats = [
        { label: 'My Files', value: '0' },
        { label: 'Shared with Me', value: '68' },
        { label: 'Recent Access', value: '37' },
        { label: 'Secure Links', value: '12' },
        ];

        expectedStats.forEach(({ label, value }) => {
        cy.contains(label).should('exist');
        cy.contains(value).should('exist');
        });
    });

    it('applies correct Tailwind classes and renders icons', () => {
        cy.mount(<DashboardHomePage />);
        cy.get('.text-blue-600').should('have.length.at.least', 1);
        cy.get('.text-green-600').should('have.length.at.least', 1);
        cy.get('.text-purple-600').should('have.length.at.least', 1);
        cy.get('.text-yellow-600').should('have.length.at.least', 1);
    });
});
