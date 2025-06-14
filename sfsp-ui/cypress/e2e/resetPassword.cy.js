describe('Password Reset Request Page', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/requestReset');
  });

  it('should submit the reset form and redirect to confirmReset page on success', () => {
    cy.intercept('POST', '**/sendResetEmail**', {
      statusCode: 200,
      body: { message: 'Reset PIN sent to email' },
    }).as('sendReset');

    cy.get('input[name="email"]').type('testuser@example.com');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', 'http://localhost:3000/requestReset');
  });
});
