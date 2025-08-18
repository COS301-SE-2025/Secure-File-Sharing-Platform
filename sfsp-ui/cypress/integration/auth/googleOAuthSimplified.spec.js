describe("Google OAuth Integration Tests - Simplified", () => {
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

    describe("Basic OAuth Flow", () => {
        it("should handle missing authorization code", () => {
            cy.visit("http://localhost:3000/auth/google/callback?state=test-state-123");

            cy.url({ timeout: 10000 }).should('include', '/auth');
            cy.url().should('include', 'error=no_code');
        });
    });

    describe("New User Registration Flow", () => {
        it("should register new Google user and redirect to email verification", () => {
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
                            is_verified: false
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
        });

        it("should handle PostgreSQL insertion failure gracefully during registration", () => {
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

    describe("API Integration", () => {
        it("should make correct API calls for new user registration", () => {
            cy.window().then((win) => {
                win.sessionStorage.setItem('googleOAuthState', 'api-test-state');
            });

            // Mock all required endpoints
            cy.intercept('GET', '/api/auth/google?code=api-test-code', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-api-test',
                        email: 'apitest@gmail.com',
                        name: 'API Test User'
                    }
                }
            }).as('googleCallback');

            cy.intercept('GET', 'http://localhost:5000/api/users/getUserId/apitest@gmail.com', {
                statusCode: 404,
                body: { error: 'User not found' }
            }).as('checkUserExists');

            cy.intercept('POST', 'http://localhost:5000/api/users/google-auth', (req) => {
                // Verify the request body contains expected data
                expect(req.body).to.have.property('email', 'apitest@gmail.com');
                expect(req.body).to.have.property('name', 'API Test User');
                expect(req.body).to.have.property('google_id', 'google-api-test');
                expect(req.body).to.have.property('keyBundle');
                
                req.reply({
                    statusCode: 200,
                    body: {
                        success: true,
                        data: {
                            user: {
                                id: 'api-test-uuid',
                                email: 'apitest@gmail.com',
                                is_verified: false
                            },
                            isNewUser: true
                        }
                    }
                });
            }).as('googleAuthRegistration');

            cy.intercept('POST', 'http://localhost:5000/api/files/addUser', (req) => {
                // Verify the PostgreSQL request contains correct user ID
                expect(req.body).to.have.property('userId', 'api-test-uuid');
                
                req.reply({
                    statusCode: 200,
                    body: { success: true }
                });
            }).as('addUserToPostgres');

            cy.visit("http://localhost:3000/auth/google/callback?code=api-test-code&state=api-test-state");

            // Verify all API calls were made with correct data
            cy.wait('@googleCallback');
            cy.wait('@checkUserExists');
            cy.wait('@googleAuthRegistration');
            cy.wait('@addUserToPostgres');

            cy.url({ timeout: 15000 }).should('include', '/auth/verify-email');
        });
    });

    describe("Error Scenarios", () => {
        it("should handle backend service unavailable", () => {
            cy.window().then((win) => {
                win.sessionStorage.setItem('googleOAuthState', 'backend-down-state');
            });

            cy.intercept('GET', '/api/auth/google?code=backend-down-code', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-backend-down',
                        email: 'backenddown@gmail.com',
                        name: 'Backend Down User'
                    }
                }
            }).as('googleCallback');

            // Simulate backend being completely down
            cy.intercept('GET', 'http://localhost:5000/api/users/getUserId/backenddown@gmail.com', {
                forceNetworkError: true
            }).as('checkUserExists');

            cy.intercept('POST', 'http://localhost:5000/api/users/google-auth', {
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        user: {
                            id: 'backend-down-uuid',
                            email: 'backenddown@gmail.com',
                            is_verified: false
                        },
                        isNewUser: true
                    }
                }
            }).as('googleAuthRegistration');

            cy.intercept('POST', 'http://localhost:5000/api/files/addUser', {
                statusCode: 200,
                body: { success: true }
            }).as('addUserToPostgres');

            cy.visit("http://localhost:3000/auth/google/callback?code=backend-down-code&state=backend-down-state");

            cy.wait('@googleCallback');
            // Backend down should default to registration flow
            cy.wait('@googleAuthRegistration');
            cy.wait('@addUserToPostgres');

            cy.url({ timeout: 15000 }).should('include', '/auth/verify-email');
        });
    });
});
