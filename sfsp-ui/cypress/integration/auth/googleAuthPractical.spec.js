describe("Google Authentication - Practical E2E Tests", () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
        cy.visit("http://localhost:3000/auth");
        cy.get('body').should('be.visible');
        cy.get('[data-testid="auth-page"]', { timeout: 15000 }).should('be.visible');
    });

    describe("Google OAuth Button Functionality", () => {
        it("should display and interact with Google OAuth button on login tab", () => {
        cy.get("div").contains("Log In").click();
        cy.get('[data-testid="google-oauth-button"]')
            .should('be.visible')
            .should('not.be.disabled');
        cy.get('[data-testid="google-oauth-button"]')
            .should('contain', 'Continue with Google')
            .find('svg')
            .should('exist');
        cy.get('[data-testid="google-oauth-button"] svg path')
            .should('have.length', 4);
        });

        it("should display Google OAuth button on signup tab", () => {
        cy.get("div").contains("Sign Up").click();
        cy.get('[data-testid="google-oauth-button"]')
            .should('be.visible')
            .should('not.be.disabled')
            .should('contain', 'Continue with Google');
        });
    });

    afterEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });
});
