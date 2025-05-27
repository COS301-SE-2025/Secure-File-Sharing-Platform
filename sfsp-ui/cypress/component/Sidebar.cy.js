import React from 'react';
import Sidebar from '../../app/dashboard/components/Sidebar';
import { AppRouterMockProvider } from '../support/AppRouterMockProvider';

describe('<Sidebar />', () => {
    beforeEach(() => {
        cy.viewport('macbook-15');

        cy.window().then((win) => {
        win.localStorage.setItem('token', 'mock-jwt-token');
        });

        cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
            success: true,
            data: {
            id: '67b0b467-f2e7-4346-8afe-1d4a0b0fc695',
            username: 'TestUser',
            email: 'testuser@gmail.com',
            },
        },
        }).as('getProfile');
    });

    it('renders correctly', () => {
        cy.mount(
        <AppRouterMockProvider>
            <Sidebar />
        </AppRouterMockProvider>
        );
        cy.get('[data-testid="sidebar"]').should('be.visible');
    });

    it('displays navigation links', () => {
        cy.mount(
        <AppRouterMockProvider>
            <Sidebar />
        </AppRouterMockProvider>
        );
        cy.get('[data-testid="sidebar"]').within(() => {
        cy.contains('Dashboard').should('exist');
        cy.contains('My Files').should('exist');
        cy.contains('Shared with Me').should('exist');
        cy.contains('Access Logs').should('exist');
        cy.contains('Trash').should('exist');
        });
    });

    it('toggles user dropdown when profile button is clicked', () => {
        cy.mount(
        <AppRouterMockProvider>
            <Sidebar />
        </AppRouterMockProvider>
        );
        cy.wait('@getProfile');
        cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('[data-testid="profile-button"]').should('be.visible');
        cy.contains('TestUser').should('be.visible');
        cy.contains('testuser@gmail.com').should('be.visible');
        cy.contains('Logout').should('not.exist');

        cy.get('[data-testid="profile-button"]').click();
        cy.contains('Logout').should('be.visible');

        cy.get('[data-testid="profile-button"]').click();
        cy.contains('Logout').should('not.exist');
        });
    });

    it('toggles settings dropdown when settings button is clicked', () => {
        cy.mount(
        <AppRouterMockProvider>
            <Sidebar />
        </AppRouterMockProvider>
        );
        cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('[data-testid="settings-dropdown"]').first().should('be.visible');
        cy.get('[data-testid="settings-dropdown"]').should('have.length', 1);

        cy.get('[data-testid="settings-dropdown"]').first().click();
        cy.get('[data-testid="settings-dropdown"]').should('have.length', 2);
        cy.contains('Account Settings').should('be.visible');
        cy.contains('Dark Mode').should('be.visible');

        cy.get('[data-testid="settings-dropdown"]').first().click();
        cy.get('[data-testid="settings-dropdown"]').should('have.length', 1);
        });
    });
});