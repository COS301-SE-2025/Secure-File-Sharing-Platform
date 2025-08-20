describe("Google OAuth Integration Tests - Database & File Operations", () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
        cy.clearAllSessionStorage();
        
        // Clear the Zustand persistence store specifically
        cy.window().then((win) => {
            win.localStorage.removeItem('encryption-store');
            win.sessionStorage.clear();
        });
    });

    describe("Google OAuth User Registration with Database Integration", () => {
        it("should register new Google user and add to PostgreSQL database", () => {
            // Set up OAuth state first
            cy.window().then((win) => {
                win.sessionStorage.setItem('googleOAuthState', 'test-state-123');
            });

            // Mock the Google OAuth callback response for new user
            cy.intercept('GET', '/api/auth/google?code=new-user-code', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-new-123',
                        email: 'testuser@gmail.com',
                        name: 'Test User',
                        picture: 'https://lh3.googleusercontent.com/a/test-user',
                        verified_email: true
                    }
                }
            }).as('googleCallback');

            // Mock the backend user existence check (404 = user doesn't exist)
            cy.intercept('GET', 'http://localhost:5000/api/users/getUserId/testuser@gmail.com', {
                statusCode: 404,
                body: { error: 'User not found' }
            }).as('checkUserExists');

            // Mock the Google auth registration endpoint
            cy.intercept('POST', 'http://localhost:5000/api/users/google-auth', {
                statusCode: 200,
                body: {
                    success: true,
                    message: 'Account created successfully. Please verify your email.',
                    data: {
                        user: {
                            id: 'db-user-uuid-123',
                            username: 'Test User',
                            email: 'testuser@gmail.com',
                            avatar_url: 'https://lh3.googleusercontent.com/a/test-user',
                            is_verified: false,
                            ik_public: 'mock-ik-public',
                            spk_public: 'mock-spk-public',
                            opks_public: [],
                            nonce: 'bW9jay1ub25jZQ==', // base64 'mock-nonce'
                            signedPrekeySignature: 'mock-signature',
                            salt: 'bW9jay1zYWx0' // base64 'mock-salt'
                        },
                        isNewUser: true
                    }
                }
            }).as('googleAuthRegistration');

            // Mock the PostgreSQL user insertion
            cy.intercept('POST', 'http://localhost:5000/api/files/addUser', {
                statusCode: 200,
                body: { success: true, message: 'User added to PostgreSQL database' }
            }).as('addUserToPostgres');

            // Start the Google OAuth callback flow
            cy.visit("http://localhost:3000/auth/google/callback?code=new-user-code&state=test-state-123");

            // Wait for the OAuth callback
            cy.wait('@googleCallback');

            // Wait for user existence check
            cy.wait('@checkUserExists');

            // Wait for registration
            cy.wait('@googleAuthRegistration');

            // Wait for PostgreSQL insertion
            cy.wait('@addUserToPostgres');

            // Verify redirect to email verification
            cy.url({ timeout: 15000 }).should('include', '/auth/verify-email');
            cy.url().should('include', 'email=testuser%40gmail.com'); // URL encoded
            cy.url().should('include', 'userId=db-user-uuid-123');

            // Verify localStorage is cleared and no stale state persists
            cy.window().then((win) => {
                expect(win.localStorage.getItem('encryption-store')).to.be.null;
                expect(win.localStorage.getItem('googleAuthInProgress')).to.be.null;
            });
        });
    });

    describe("Google OAuth Error Handling", () => {
        it("should handle PostgreSQL insertion failure gracefully", () => {
            cy.window().then((win) => {
                win.sessionStorage.setItem('googleOAuthState', 'fail-state-123');
            });

            cy.intercept('GET', '/api/auth/google?code=fail-user-code', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-user-789',
                        email: 'failuser@gmail.com',
                        name: 'Fail User',
                        picture: 'https://lh3.googleusercontent.com/a/fail-user'
                    }
                }
            }).as('googleCallback');

            cy.intercept('GET', 'http://localhost:5000/api/users/getUserId/failuser@gmail.com', {
                statusCode: 404,
                body: { error: 'User not found' }
            }).as('checkUserExists');

            cy.intercept('POST', 'http://localhost:5000/api/users/google-auth', {
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        user: {
                            id: 'fail-user-uuid-789',
                            email: 'failuser@gmail.com',
                            is_verified: false
                        },
                        isNewUser: true
                    }
                }
            }).as('googleAuthRegistration');

            // Mock PostgreSQL insertion failure
            cy.intercept('POST', 'http://localhost:5000/api/files/addUser', {
                statusCode: 500,
                body: { error: 'Database connection failed' }
            }).as('addUserToPostgresFail');

            cy.visit("http://localhost:3000/auth/google/callback?code=fail-user-code&state=fail-state-123");

            cy.wait('@googleCallback');
            cy.wait('@checkUserExists');
            cy.wait('@googleAuthRegistration');
            cy.wait('@addUserToPostgresFail');

            // Should still proceed to email verification despite PostgreSQL failure
            cy.url({ timeout: 15000 }).should('include', '/auth/verify-email');
            cy.url().should('include', 'email=failuser%40gmail.com'); // URL encoded
        });
    });
});
