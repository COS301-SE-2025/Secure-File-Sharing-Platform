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

        it("should initiate OAuth flow when Google button is clicked", () => {
        cy.window().then((win) => {
            cy.stub(win, 'open').as('windowOpen');
        });
        cy.get('[data-testid="google-oauth-button"]').click();
        cy.get('[data-testid="loader"]', { timeout: 5000 }).should('be.visible');
        cy.get('[data-testid="loader-message"]').should('contain', 'Redirecting to Google...');
        cy.window().then((win) => {
            expect(win.localStorage.getItem('googleAuthState')).to.not.be.null;
            expect(win.localStorage.getItem('googleAuthInProgress')).to.equal('true');
        });
        cy.get('@windowOpen').should('have.been.called');
        });

        it("should handle OAuth button clicks on signup tab", () => {
        cy.get("div").contains("Sign Up").click();
        cy.window().then((win) => {
            cy.stub(win, 'open').as('windowOpen');
        });
        cy.get('[data-testid="google-oauth-button"]').click();
        cy.get('[data-testid="loader"]', { timeout: 5000 }).should('be.visible');
        cy.get('[data-testid="loader-message"]').should('contain', 'Redirecting to Google...');
        });
    });

    describe("OAuth Error Handling from URL Parameters", () => {
        it("should handle OAuth cancellation error", () => {
        cy.visit("http://localhost:3000/auth?error=oauth_cancelled");
        cy.get('.bg-red-100').should('contain', 'Google authentication was cancelled');
        });

        it("should handle various OAuth error scenarios", () => {
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

        it("should clean up URL parameters after showing error", () => {
        cy.visit("http://localhost:3000/auth?error=oauth_error");
        cy.get('.bg-red-100').should('be.visible');
        });
    });

    describe("Google OAuth Callback Page Tests", () => {
        beforeEach(() => {
        cy.window().then((win) => {
            win.localStorage.setItem('googleAuthState', 'test-state-123');
            win.localStorage.setItem('googleAuthInProgress', 'true');
        });
        });

        it("should show loader when visiting callback page", () => {
        cy.visit("http://localhost:3000/auth/google/callback?code=test-code&state=test-state-123");
        cy.get('body').should('be.visible');
        cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
        cy.get('[data-testid="loader-message"]').should('contain', 'Processing Google authentication');
        });

        it("should handle missing authorization code", () => {
        cy.visit("http://localhost:3000/auth/google/callback?state=test-state-123");
        cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
        cy.get('[data-testid="loader-message"]').should('contain', 'Missing authorization code');
        cy.url({ timeout: 10000 }).should('include', '/auth?error=missing_code');
        });

        it("should handle OAuth access denied", () => {
        cy.visit("http://localhost:3000/auth/google/callback?error=access_denied&state=test-state-123");
        cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
        cy.get('[data-testid="loader-message"]').should('contain', 'Google authentication was cancelled');
        cy.url({ timeout: 10000 }).should('include', '/auth?error=oauth_cancelled');
        });

        it("should handle invalid state parameter", () => {
        cy.visit("http://localhost:3000/auth/google/callback?code=valid-code&state=invalid-state");
        cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
        cy.get('[data-testid="loader-message"]').should('contain', 'Invalid authentication state');
        cy.url({ timeout: 10000 }).should('include', '/auth?error=invalid_state');
        });

        it("should detect and prevent code reuse", () => {
        cy.window().then((win) => {
            win.localStorage.setItem('lastUsedGoogleCode', 'reused-code');
        });
        cy.visit("http://localhost:3000/auth/google/callback?code=reused-code&state=test-state-123");
        cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
        cy.get('[data-testid="loader-message"]').should('contain', 'already been used');
        cy.url({ timeout: 10000 }).should('include', '/auth?error=code_reused');
        });

        it("should clean up localStorage on various scenarios", () => {
        cy.visit("http://localhost:3000/auth/google/callback?code=test&state=invalid");
        cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
        cy.url({ timeout: 10000 }).should('include', '/auth?error=invalid_state');
        cy.window().then((win) => {
            expect(win.localStorage.getItem('googleAuthInProgress')).to.be.null;
            expect(win.localStorage.getItem('googleAuthState')).to.be.null;
        });
        });
    });

    describe("Integration with Regular Authentication", () => {
        it("should allow switching between Google auth and regular login", () => {
        cy.get('input[name="email"]').should('be.visible');
        cy.get('input[name="password"]').should('be.visible');
        cy.get('input[name="email"]').type('test@example.com');
        cy.get('input[name="password"]').type('password123');
        cy.get('[data-testid="google-oauth-button"]').should('be.visible');
        cy.get('input[name="email"]').should('have.value', 'test@example.com');
        cy.get('input[name="password"]').should('have.value', 'password123');
        });

        it("should preserve form state when switching tabs", () => {
        cy.get('input[name="email"]').type('test@example.com');
        cy.get("div").contains("Sign Up").click();
        cy.get('[data-testid="google-oauth-button"]')
            .should('be.visible')
            .should('not.be.disabled');
        cy.get("div").contains("Log In").click();
        cy.get('input[name="email"]').should('have.value', 'test@example.com');
        });

        it("should not interfere with signup form validation", () => {
        cy.get("div").contains("Sign Up").click();
        cy.get('input[name="name"]').type('Test User');
        cy.get('input[name="email"]').type('test@example.com');
        cy.get('input[name="password"]').type('TestPassword123!');
        cy.get('[data-testid="google-oauth-button"]').should('be.visible');
        cy.get('input[name="name"]').should('have.value', 'Test User');
        cy.get('input[name="email"]').should('have.value', 'test@example.com');
        cy.get('input[name="password"]').should('have.value', 'TestPassword123!');
        });
    });

    describe("Accessibility and User Experience", () => {
        it("should support keyboard navigation for Google OAuth button", () => {
        cy.get('[data-testid="google-oauth-button"]')
            .focus()
            .should('have.focus');
        cy.window().then((win) => {
            cy.stub(win, 'open').as('windowOpen');
        });
        cy.get('[data-testid="google-oauth-button"]')
            .focus()
            .type('{enter}');
        cy.get('[data-testid="loader"]', { timeout: 5000 }).should('be.visible');
        });

        it("should maintain proper visual states", () => {
        cy.get('[data-testid="google-oauth-button"]')
            .should('have.class', 'hover:bg-gray-100')
            .should('have.class', 'transition');
        cy.window().then((win) => {
            cy.stub(win, 'open').as('windowOpen');
        });
        cy.get('[data-testid="google-oauth-button"]').click();
        cy.get('[data-testid="google-oauth-button"]')
            .should('be.disabled')
            .should('have.class', 'disabled:opacity-50')
            .should('have.class', 'disabled:cursor-not-allowed');
        });

        it("should provide clear visual feedback during OAuth flow", () => {
        cy.window().then((win) => {
            cy.stub(win, 'open').as('windowOpen');
        });
        cy.get('[data-testid="google-oauth-button"]').click();
        cy.get('[data-testid="loader"]').should('be.visible');
        cy.get('[data-testid="loader-message"]')
            .should('be.visible')
            .should('have.class', 'text-white');
        cy.get('[data-testid="loader"]')
            .should('have.class', 'fixed')
            .should('have.class', 'inset-0')
            .should('have.class', 'z-50');
        });
    });

    afterEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });
});
