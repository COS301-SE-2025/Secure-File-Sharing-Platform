describe('Password Reset Confirmation Page', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/confirmReset');
  });

  it('should reset the password and redirect to login page', () => {
    cy.intercept('POST', '**/confirmReset**', {
      statusCode: 200,
      body: { message: 'Password reset successfully' },
    }).as('confirmReset');

    cy.get('input[name="email"]').type('testuser@example.com');
    cy.get('input[name="password"]').type('NewPassword123!');
    cy.get('input[name="confirmPassword"]').type('NewPassword123!');
        cy.get('input[name="resetPin"]').type('123456');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', 'http://localhost:3000/confirmReset');
  });
});
