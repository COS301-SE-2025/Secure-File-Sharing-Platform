import React from 'react';
import AccountSettings from '../../app/Settings/accountSettings/page';
import '../../app/globals.css';

describe('AccountSettings Component', () => {
    beforeEach(() => {
        cy.mount(<AccountSettings />);
    });

    it('renders header and tabs', () => {
        cy.wait('@getProfile');
        cy.get('h1').contains('testuser').should('be.visible');
        cy.get('button').contains('MY ACCOUNT').should('be.visible');
        cy.get('button').contains('CHANGE PASSWORD').should('be.visible');
        cy.get('button').contains('NOTIFICATIONS').should('be.visible');
    });

    it('displays user data in MY ACCOUNT tab', () => {
        cy.wait('@getProfile');
        cy.get('input#username').should('have.value', 'testuser');
        cy.get('input#email').should('have.value', 'test@example.com');
        cy.get('.w-10.h-10').contains('TE').should('be.visible');
    });

    it('validates form inputs in MY ACCOUNT', () => {
        cy.wait('@getProfile');
        cy.get('input#username').clear();
        cy.get('input#email').clear();
        cy.get('button').contains('Save changes').click();
        cy.get('#username-error').contains('Username is required').should('be.visible');
        cy.get('#email-error').contains('Email is required').should('be.visible');

        cy.get('input#email').type('invalid-email');
        cy.get('button').contains('Save changes').click();
        cy.get('#email-error').contains('Email format is invalid').should('be.visible');
    });

    it('saves changes in MY ACCOUNT', () => {
        cy.wait('@getProfile');
        cy.get('input#username').clear().type('newuser');
        cy.get('input#email').clear().type('new@example.com');
        cy.get('input#username').should('have.value', 'newuser');
        cy.get('input#email').should('have.value', 'new@example.com');
    });

    it('handles CHANGE PASSWORD flow', () => {
        cy.wait('@getProfile');
        cy.get('button').contains('CHANGE PASSWORD').click();
        cy.get('input#currentPassword').type('current123');
        cy.get('button').contains('Verify & Send PIN').click();
        cy.wait('@verifyPassword');
        cy.wait('@sendResetPin');
        cy.contains('A 5-character PIN has been sent to your email').should('be.visible');

        cy.get('input#resetPIN').type('12345');
        cy.get('button').contains('Verify PIN').click();
        cy.contains('PIN verified!').should('be.visible');

        cy.get('input#newPassword').type('new123456');
        cy.get('input#confirmPassword').type('new123456');
        cy.get('button').contains('Change Password').click();
        cy.wait('@changePassword');
        cy.contains('Password changed successfully!').should('be.visible');
    });

    it('switches tabs', () => {
        cy.wait('@getProfile');
        cy.get('button').contains('CHANGE PASSWORD').click();
        cy.get('h3').contains('Change Password').should('be.visible');

        cy.get('button').contains('NOTIFICATIONS').click();
        cy.get('h3').contains('Notification Settings').should('be.visible');

        cy.get('button').contains('MY ACCOUNT').click();
        cy.get('input#username').should('be.visible');
    });

    it('displays NOTIFICATIONS tab', () => {
        cy.wait('@getProfile');
        cy.get('button').contains('NOTIFICATIONS').click();
        cy.get('p').contains('Notification settings coming soon...').should('be.visible');
    });
});
