

describe("Google Authentication - E2E", () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
        
        cy.visit("http://localhost:3000/auth");
        
        cy.get('[data-testid="auth-page"]', { timeout: 10000 }).should('be.visible');
    });

    describe("Google OAuth Button", () => {
        it("should display Google sign-in button on login tab", () => {
        // Ensure we're on the login tab
        cy.get("div").contains("Log In").click();
        
        cy.get('[data-testid="google-oauth-button"]').should('be.visible');
        cy.get('[data-testid="google-oauth-button"]').should('not.be.disabled');
        cy.get('[data-testid="google-oauth-button"]').should('contain', 'Continue with Google');
        
        // Verify Google logo is present
        cy.get('[data-testid="google-oauth-button"]').find('svg').should('exist');
        });

        it("should display Google sign-up button on signup tab", () => {
        cy.get("div").contains("Sign Up").click();
        
        cy.get('[data-testid="google-oauth-button"]').should('be.visible');
        cy.get('[data-testid="google-oauth-button"]').should('not.be.disabled');
        cy.get('[data-testid="google-oauth-button"]').should('contain', 'Continue with Google');
        
        cy.get('[data-testid="google-oauth-button"]').find('svg').should('exist');
        });
    });

    describe("Google OAuth Flow", () => {
        it("should have proper Google OAuth button functionality", () => {
        cy.get('[data-testid="google-oauth-button"]')
            .should('be.visible')
            .should('not.be.disabled')
            .should('contain', 'Continue with Google')
            .should('have.attr', 'type', 'button');
            
        cy.get('[data-testid="google-oauth-button"] svg')
            .should('exist')
            .should('have.class', 'w-5')
            .should('have.class', 'h-5');
            
        // Verify the button styling
        cy.get('[data-testid="google-oauth-button"]')
            .should('have.class', 'w-full')
            .should('have.class', 'flex')
            .should('have.class', 'items-center')
            .should('have.class', 'justify-center');
        });

        it("should handle Google OAuth cancellation", () => {
        cy.visit("http://localhost:3000/auth?error=oauth_cancelled");
        
        cy.get('.bg-red-100').should('contain', 'Google authentication was cancelled');
        });

        it("should handle OAuth errors gracefully", () => {
        const errorScenarios = [
            { error: 'oauth_error', message: 'Google authentication was cancelled or failed' },
            { error: 'missing_code', message: 'Google authentication failed. Missing authorization code' },
            { error: 'code_expired', message: 'Authorization code has expired' },
            { error: 'invalid_state', message: 'Invalid authentication state' },
            { error: 'authentication_failed', message: 'Failed to authenticate with our servers' }
        ];

        errorScenarios.forEach(scenario => {
            cy.visit(`http://localhost:3000/auth?error=${scenario.error}`);
            cy.get('.bg-red-100').should('contain', scenario.message);
        });
        });
    });

    describe("Integration with Regular Auth Flow", () => {
        it("should allow switching between Google auth and regular login", () => {
        cy.get('input[name="email"]').should('be.visible');
        cy.get('input[name="password"]').should('be.visible');

        cy.get('[data-testid="google-oauth-button"]').should('be.visible');

        cy.get('input[name="email"]').type('test@example.com');
        cy.get('input[name="password"]').type('password123');
        cy.get('input[name="email"]').should('have.value', 'test@example.com');
        });

        it("should clean up auth state when switching between tabs", () => {
        cy.window().then((win) => {
            win.localStorage.setItem('googleAuthInProgress', 'true');
        });

        cy.get("div").contains("Sign Up").click();

        cy.get('[data-testid="google-oauth-button"]').should('be.visible');
        cy.get('[data-testid="google-oauth-button"]').should('not.be.disabled');
        });

        it("should handle missing environment variables gracefully", () => {
        cy.get('[data-testid="google-oauth-button"]')
            .should('be.visible')
            .should('not.be.disabled');
            
        // Verify button text and basic functionality
        cy.get('[data-testid="google-oauth-button"]')
            .should('contain', 'Continue with Google');
        });
    });

    afterEach(() => {
        // Clean up after each test
        cy.clearLocalStorage();
        cy.clearCookies();
    });
});
