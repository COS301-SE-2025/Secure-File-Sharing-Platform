describe('Password Reset Confirmation Page', () => {
  beforeEach(() => {
    cy.visit('/confirmReset');
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

    // Wait for the API call to complete
    cy.wait('@confirmReset');

    // Check for success message and redirection to login
    cy.contains('Password reset successfully').should('be.visible');
    cy.url().should('include', '/auth/login');
  });
});
