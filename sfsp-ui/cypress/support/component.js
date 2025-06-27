// cypress/support/component.js
import './commands';
import '../../app/globals.css';
import { mount } from 'cypress/react';
import '@cypress/code-coverage/support';

Cypress.Commands.add('mount', mount);

beforeEach(() => {
    cy.window().then((win) => {
        win.localStorage.setItem('token', 'mock-token');
    });

    cy.intercept('GET', '**/api/users/profile', {
        statusCode: 200,
        body: {
            data: {
                username: 'testuser',
                email: 'test@example.com',
            },
        },
    }).as('getProfile');

    cy.intercept('PUT', '**/api/users/profile', (req) => {
        req.reply((res) => {
            const body = req.body || {};
            res.send({
                statusCode: 200,
                body: {
                    data: {
                        username: body.username || 'newuser',
                        email: body.email || 'new@example.com',
                    },
                },
            });
        });
    }).as('updateProfile');

    cy.intercept('DELETE', '**/api/users/profile', {
        statusCode: 200,
        body: {},
    }).as('deleteProfile');

    cy.intercept('POST', '**/api/users/verify-password', {
        statusCode: 200,
        body: {},
    }).as('verifyPassword');

    cy.intercept('POST', '**/api/users/send-reset-pin', {
        statusCode: 200,
        body: {},
    }).as('sendResetPin');

    cy.intercept('POST', '**/api/users/change-password', {
        statusCode: 200,
        body: {},
    }).as('changePassword');
});
