describe("Google Authentication - Simplified Tests Using Custom Commands", () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
        cy.visit("http://localhost:3000/auth");
        cy.mockEnvironmentVariables();
    });

    describe("Basic Google OAuth Flow", () => {
        it("should complete new user registration via Google", () => {
        cy.setupGoogleOAuthState();
        cy.mockCompleteGoogleFlowNewUser({
            googleUser: {
            id: 'google-simple-123',
            email: 'simple@gmail.com',
            name: 'Simple User',
            verified_email: true
            },
            createdUser: {
            id: 'simple-user-456',
            email: 'simple@gmail.com',
            username: 'Simple User',
            google_id: 'google-simple-123'
            }
        });
        cy.verifyGoogleOAuthButton();
        cy.clickGoogleOAuthButton();
        cy.waitForLoader('Redirecting to Google...');
        cy.visitGoogleCallback({ 
            code: 'simple-auth-code',
            state: 'test-state-123'
        });
        cy.wait('@googleCallback');
        cy.wait('@getUserByGoogleId');
        cy.wait('@getUserByEmail');
        cy.wait('@createGoogleUser');
        cy.wait('@sendVerification');
        cy.url().should('include', '/auth/verify-email');
        cy.url().should('include', 'email=simple@gmail.com');
        cy.verifyOAuthCleanup();
        });

        it("should handle existing user login via Google", () => {
        cy.setupGoogleOAuthState();
        cy.mockCompleteGoogleFlowExistingUser({
            googleUser: {
            id: 'google-existing-456',
            email: 'existing@gmail.com',
            name: 'Existing User',
            verified_email: true
            }
        });
        cy.verifyGoogleOAuthButton();
        cy.clickGoogleOAuthButton();
        cy.visitGoogleCallback({
            code: 'existing-auth-code',
            state: 'test-state-123'
        });
        cy.wait('@googleCallback');
        cy.wait('@getUserByGoogleId');
        cy.wait('@sendVerification');
        cy.url().should('include', '/auth/verify-email');
        cy.verifyOAuthCleanup();
        });
    });

    describe("Error Scenarios", () => {
        it("should handle OAuth cancellation", () => {
        cy.setupGoogleOAuthState();
        cy.visitGoogleCallback({
            error: 'access_denied',
            state: 'test-state-123'
        });
        cy.verifyOAuthError('oauth_cancelled', 'Google authentication was cancelled');
        });

        it("should handle invalid state", () => {
        cy.setupGoogleOAuthState();
        cy.visitGoogleCallback({
            code: 'valid-code',
            state: 'invalid-state'
        });
        cy.verifyOAuthError('invalid_state', 'Invalid authentication state');
        });

        it("should handle token exchange failure", () => {
        cy.setupGoogleOAuthState();
        cy.mockGoogleCallback({
            statusCode: 400,
            user: null
        });
        cy.visitGoogleCallback();
        cy.wait('@googleCallback');
        cy.verifyOAuthError('authentication_failed', 'Authentication failed');
        });

        it("should handle user creation failure", () => {
        cy.setupGoogleOAuthState();
        cy.mockGoogleCallback();
        cy.mockUserByGoogleId('google-test-123', null);
        cy.mockUserByEmail('test@gmail.com', null);
        cy.mockCreateGoogleUser(
            { error: 'Database error' },
            500
        );
        cy.visitGoogleCallback();
        cy.wait('@googleCallback');
        cy.wait('@getUserByGoogleId');
        cy.wait('@getUserByEmail');
        cy.wait('@createGoogleUser');
        cy.verifyOAuthError('authentication_failed', 'Authentication failed');
        });
    });

    describe("Integration with Regular Auth", () => {
        it("should allow switching between Google and regular auth", () => {
        cy.loginWithCredentials('test@example.com', 'password123');
        cy.get('input[name="email"]').should('have.value', 'test@example.com');
        cy.verifyGoogleOAuthButton();
        cy.clickGoogleOAuthButton();
        cy.waitForLoader('Redirecting to Google...');
        });

        it("should preserve form data when Google auth is cancelled", () => {
        cy.signupWithCredentials({
            name: 'Test User',
            email: 'test@example.com',
            password: 'TestPassword123!',
            confirmPassword: 'TestPassword123!'
        });
        cy.get('input[name="name"]').should('have.value', 'Test User');
        cy.get('input[name="email"]').should('have.value', 'test@example.com');
        });
    });

    afterEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });
});
