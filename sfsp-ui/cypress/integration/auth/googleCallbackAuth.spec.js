describe("Google OAuth Callback - E2E", () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
        cy.window().then((win) => {
            win.localStorage.setItem('googleAuthState', 'test-state-123');
            win.localStorage.setItem('googleAuthInProgress', 'true');
        });
    });

    describe("Successful OAuth Callback Flow", () => {
        it("should handle new user registration flow", () => {
            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-user-123',
                        email: 'newuser@gmail.com',
                        name: 'New User',
                        picture: 'https://lh3.googleusercontent.com/a/default-user',
                        verified_email: true
                    },
                    tokens: {
                        access_token: 'ya29.mock-access-token',
                        id_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...'
                    }
                }
            }).as('googleCallback');

            cy.intercept('POST', '/api/auth/send-verification', {
                statusCode: 200,
                body: { success: true }
            }).as('sendVerification');

            cy.visit("http://localhost:3000/auth/google/callback?code=valid-auth-code&state=test-state-123");

            cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
            cy.get('[data-testid="loader-message"]').should('contain', 'Processing Google authentication');
            cy.wait('@googleCallback');
            cy.url({ timeout: 15000 }).should('include', '/auth/verify-email');
            cy.url().should('include', 'email=newuser@gmail.com');
            cy.window().then((win) => {
                expect(win.localStorage.getItem('googleAuthInProgress')).to.be.null;
                expect(win.localStorage.getItem('googleAuthState')).to.be.null;
                expect(win.localStorage.getItem('lastUsedGoogleCode')).to.not.be.null;
            });
        });

        it("should handle existing user login flow", () => {
            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-existing-123',
                        email: 'existing@gmail.com',
                        name: 'Existing User',
                        picture: 'https://lh3.googleusercontent.com/a/existing-user',
                        verified_email: true
                    },
                    tokens: {
                        access_token: 'ya29.existing-access-token',
                        id_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...'
                    }
                }
            }).as('googleCallback');

            cy.intercept('POST', '/api/auth/send-verification', {
                statusCode: 200,
                body: { success: true }
            }).as('sendVerification');

            cy.visit("http://localhost:3000/auth/google/callback?code=existing-user-code&state=test-state-123");

            cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
            cy.get('[data-testid="loader-message"]').should('contain', 'Processing Google authentication');
            cy.wait('@googleCallback');
            cy.url({ timeout: 15000 }).should('include', '/auth/verify-email');
            cy.url().should('include', 'email=existing@gmail.com');
        });

        it("should handle user with email but no Google ID (account linking)", () => {
            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-link-123',
                        email: 'link@gmail.com',
                        name: 'Link User',
                        picture: 'https://lh3.googleusercontent.com/a/link-user',
                        verified_email: true
                    },
                    tokens: {
                        access_token: 'ya29.link-access-token',
                        id_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...'
                    }
                }
            }).as('googleCallback');

            cy.intercept('POST', '/api/auth/send-verification', {
                statusCode: 200,
                body: { success: true }
            }).as('sendVerification');

            cy.visit("http://localhost:3000/auth/google/callback?code=link-user-code&state=test-state-123");

            cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
            cy.get('[data-testid="loader-message"]').should('contain', 'Processing Google authentication');
            cy.wait('@googleCallback');
            cy.url({ timeout: 15000 }).should('include', '/auth/verify-email');
        });
    });

    describe("Error Handling", () => {
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

        it("should handle authorization code reuse", () => {
            cy.window().then((win) => {
                win.localStorage.setItem('lastUsedGoogleCode', 'reused-code');
            });

            cy.visit("http://localhost:3000/auth/google/callback?code=reused-code&state=test-state-123");
            cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
            cy.get('[data-testid="loader-message"]').should('contain', 'already been used');
            cy.url({ timeout: 10000 }).should('include', '/auth?error=code_reused');
        });

        it("should handle token exchange failure", () => {
            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 400,
                body: {
                    error: 'invalid_grant',
                    details: { error: 'invalid_grant' }
                }
            }).as('failedCallback');

            cy.visit("http://localhost:3000/auth/google/callback?code=expired-code&state=test-state-123");
            cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
            cy.get('[data-testid="loader-message"]').should('contain', 'Processing Google authentication');
            cy.wait('@failedCallback');
            cy.get('[data-testid="loader-message"]').should('contain', 'Authorization code has expired');
            cy.url({ timeout: 10000 }).should('include', '/auth?error=code_expired');
        });

        it("should handle user creation failure", () => {
            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-fail-123',
                        email: 'fail@gmail.com',
                        name: 'Fail User',
                        verified_email: true
                    },
                    tokens: { access_token: 'token' }
                }
            }).as('googleCallback');

            cy.visit("http://localhost:3000/auth/google/callback?code=fail-code&state=test-state-123");
            cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
            cy.get('[data-testid="loader-message"]').should('contain', 'Processing Google authentication');
            cy.wait('@googleCallback');
        });

        it("should handle duplicate email error", () => {
            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-dup-123',
                        email: 'duplicate@gmail.com',
                        name: 'Duplicate User',
                        verified_email: true
                    },
                    tokens: { access_token: 'token' }
                }
            }).as('googleCallback');

            cy.visit("http://localhost:3000/auth/google/callback?code=dup-code&state=test-state-123");
            cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
            cy.get('[data-testid="loader-message"]').should('contain', 'Processing Google authentication');
            cy.wait('@googleCallback');
        });

        it("should handle MFA email sending failure", () => {
            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-mfa-fail-123',
                        email: 'mfafail@gmail.com',
                        name: 'MFA Fail User',
                        verified_email: true
                    },
                    tokens: { access_token: 'token' }
                }
            }).as('googleCallback');

            cy.intercept('POST', '/api/auth/send-verification', {
                statusCode: 500,
                body: { error: 'Email service unavailable' }
            }).as('mfaFail');

            cy.visit("http://localhost:3000/auth/google/callback?code=mfa-fail-code&state=test-state-123");
            cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
            cy.get('[data-testid="loader-message"]').should('contain', 'Processing Google authentication');
            cy.wait('@googleCallback');
            cy.wait('@mfaFail');
            cy.get('[data-testid="loader-message"]').should('contain', 'Failed to send verification email');
            cy.url({ timeout: 10000 }).should('include', '/auth?error=authentication_failed');
        });
    });

    describe("State Management", () => {
        it("should properly clean up localStorage on success", () => {
            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 200,
                body: {
                    user: { id: 'test', email: 'test@gmail.com', name: 'Test', verified_email: true },
                    tokens: { access_token: 'token' }
                }
            }).as('googleCallback');

            cy.intercept('POST', '/api/auth/send-verification', {
                statusCode: 200,
                body: { success: true }
            }).as('sendVerification');

            cy.visit("http://localhost:3000/auth/google/callback?code=cleanup-test&state=test-state-123");
            cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
            cy.wait('@googleCallback');
            cy.url({ timeout: 15000 }).should('include', '/auth/verify-email');
            cy.window().then((win) => {
                expect(win.localStorage.getItem('googleAuthInProgress')).to.be.null;
                expect(win.localStorage.getItem('googleAuthState')).to.be.null;
                expect(win.localStorage.getItem('lastUsedGoogleCode')).to.equal('cleanup-test');
            });
        });

        it("should clean up localStorage on error", () => {
            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 500,
                body: { error: 'Server error' }
            }).as('serverError');

            cy.visit("http://localhost:3000/auth/google/callback?code=error-test&state=test-state-123");
            cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
            cy.wait('@serverError');
            cy.url({ timeout: 10000 }).should('include', '/auth?error=authentication_failed');
            cy.window().then((win) => {
                expect(win.localStorage.getItem('googleAuthInProgress')).to.be.null;
                expect(win.localStorage.getItem('googleAuthState')).to.be.null;
            });
        });
    });

    afterEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });
});
