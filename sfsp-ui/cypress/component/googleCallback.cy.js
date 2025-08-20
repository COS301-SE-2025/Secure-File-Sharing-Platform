import GoogleCallbackPage from '../../../app/auth/google/callback/page';
import { mount } from 'cypress/react18';

describe('Google Callback Component Tests', () => {
    beforeEach(() => {
        // Mock Next.js router
        cy.window().then((win) => {
        const mockRouter = {
            push: cy.stub().as('routerPush'),
            replace: cy.stub().as('routerReplace'),
            back: cy.stub().as('routerBack'),
            pathname: '/auth/google/callback',
            query: {},
            asPath: '/auth/google/callback'
        };
        
        cy.stub(win, 'useRouter').returns(mockRouter);
        });

        // Mock window.location
        cy.window().then((win) => {
        Object.defineProperty(win.location, 'search', {
            writable: true,
            value: '?code=test-code&state=test-state'
        });
        });

        // Set up localStorage
        cy.window().then((win) => {
        win.localStorage.setItem('googleAuthState', 'test-state');
        win.localStorage.setItem('googleAuthInProgress', 'true');
        });
    });

    describe('Component Rendering', () => {
        it('should render loading state initially', () => {
        mount(<GoogleCallbackPage />);
        
        // Should show loader
        cy.get('[data-testid="loader"]').should('exist');
        cy.get('[data-testid="loader-message"]').should('contain', 'Processing Google authentication');
        });

        it('should show proper loading messages during flow', () => {
        // Mock successful API responses
        cy.intercept('POST', '/api/auth/google/callback', {
            statusCode: 200,
            body: {
            user: {
                id: 'google-123',
                email: 'test@gmail.com',
                name: 'Test User',
                verified_email: true
            },
            tokens: { access_token: 'token' }
            }
        }).as('googleCallback');

        cy.intercept('GET', '/api/users/by-google-id/google-123', {
            statusCode: 404,
            body: { error: 'User not found' }
        }).as('getUserByGoogleId');

        cy.intercept('GET', '/api/users/by-email/test@gmail.com', {
            statusCode: 404,
            body: { error: 'User not found' }
        }).as('getUserByEmail');

        mount(<GoogleCallbackPage />);

        // Initial message
        cy.get('[data-testid="loader-message"]').should('contain', 'Processing Google authentication');
        
        // Should progress through different states
        cy.wait('@googleCallback', { timeout: 10000 });
        cy.get('[data-testid="loader-message"]').should('contain', 'Checking user account');
        
        cy.wait('@getUserByGoogleId');
        cy.wait('@getUserByEmail');
        });

        it('should handle component unmounting during API calls', () => {
        // Mock slow API response
        cy.intercept('POST', '/api/auth/google/callback', {
            statusCode: 200,
            body: { user: {}, tokens: {} },
            delay: 1000
        }).as('slowCallback');

        const wrapper = mount(<GoogleCallbackPage />);
        
        // Unmount component before API completes
        setTimeout(() => {
            wrapper.unmount();
        }, 500);

        // Should not cause errors
        cy.wait('@slowCallback');
        });
    });

    describe('URL Parameter Handling', () => {
        it('should handle missing code parameter', () => {
        cy.window().then((win) => {
            Object.defineProperty(win.location, 'search', {
            value: '?state=test-state'
            });
        });

        mount(<GoogleCallbackPage />);

        cy.get('[data-testid="loader-message"]').should('contain', 'Missing authorization code');
        cy.get('@routerPush').should('have.been.calledWith', '/auth?error=missing_code');
        });

        it('should handle access denied error', () => {
        cy.window().then((win) => {
            Object.defineProperty(win.location, 'search', {
            value: '?error=access_denied&state=test-state'
            });
        });

        mount(<GoogleCallbackPage />);

        cy.get('[data-testid="loader-message"]').should('contain', 'Google authentication was cancelled');
        cy.get('@routerPush').should('have.been.calledWith', '/auth?error=oauth_cancelled');
        });

        it('should handle invalid state parameter', () => {
        cy.window().then((win) => {
            Object.defineProperty(win.location, 'search', {
            value: '?code=test-code&state=invalid-state'
            });
        });

        mount(<GoogleCallbackPage />);

        cy.get('[data-testid="loader-message"]').should('contain', 'Invalid authentication state');
        cy.get('@routerPush').should('have.been.calledWith', '/auth?error=invalid_state');
        });

        it('should detect code reuse', () => {
        cy.window().then((win) => {
            win.localStorage.setItem('lastUsedGoogleCode', 'test-code');
            Object.defineProperty(win.location, 'search', {
            value: '?code=test-code&state=test-state'
            });
        });

        mount(<GoogleCallbackPage />);

        cy.get('[data-testid="loader-message"]').should('contain', 'already been used');
        cy.get('@routerPush').should('have.been.calledWith', '/auth?error=code_reused');
        });
    });

    describe('API Integration', () => {
        it('should handle token exchange failure', () => {
        cy.intercept('POST', '/api/auth/google/callback', {
            statusCode: 400,
            body: {
            error: 'invalid_grant',
            details: { error: 'invalid_grant' }
            }
        }).as('failedCallback');

        mount(<GoogleCallbackPage />);

        cy.wait('@failedCallback');
        cy.get('[data-testid="loader-message"]').should('contain', 'Authorization code has expired');
        cy.get('@routerPush').should('have.been.calledWith', '/auth?error=code_expired');
        });

        it('should handle successful new user creation', () => {
        // Mock complete new user flow
        cy.intercept('POST', '/api/auth/google/callback', {
            statusCode: 200,
            body: {
            user: {
                id: 'google-new-123',
                email: 'newuser@gmail.com',
                name: 'New User',
                verified_email: true
            },
            tokens: { access_token: 'token' }
            }
        }).as('googleCallback');

        cy.intercept('GET', '/api/users/by-google-id/google-new-123', {
            statusCode: 404,
            body: { error: 'User not found' }
        }).as('getUserByGoogleId');

        cy.intercept('GET', '/api/users/by-email/newuser@gmail.com', {
            statusCode: 404,
            body: { error: 'User not found' }
        }).as('getUserByEmail');

        cy.intercept('POST', '/api/users/google', {
            statusCode: 200,
            body: {
            id: 'new-user-456',
            email: 'newuser@gmail.com',
            username: 'New User',
            google_id: 'google-new-123'
            }
        }).as('createUser');

        cy.intercept('POST', '/api/auth/send-verification', {
            statusCode: 200,
            body: { success: true }
        }).as('sendVerification');

        mount(<GoogleCallbackPage />);

        cy.wait('@googleCallback');
        cy.wait('@getUserByGoogleId');
        cy.wait('@getUserByEmail');
        cy.wait('@createUser');
        cy.wait('@sendVerification');

        cy.get('[data-testid="loader-message"]').should('contain', 'Verification email sent');
        cy.get('@routerPush').should('have.been.calledWith', '/auth/verify-email?email=newuser@gmail.com&userId=new-user-456');
        });

        it('should handle existing user login', () => {
        cy.intercept('POST', '/api/auth/google/callback', {
            statusCode: 200,
            body: {
            user: {
                id: 'google-existing-123',
                email: 'existing@gmail.com',
                name: 'Existing User',
                verified_email: true
            },
            tokens: { access_token: 'token' }
            }
        }).as('googleCallback');

        cy.intercept('GET', '/api/users/by-google-id/google-existing-123', {
            statusCode: 200,
            body: {
            id: 'existing-user-789',
            email: 'existing@gmail.com',
            google_id: 'google-existing-123',
            ik_public: 'existing-key',
            spk_public: 'existing-spk',
            opks_public: JSON.stringify([]),
            salt: 'existing-salt',
            nonce: 'existing-nonce',
            signedPrekeySignature: 'existing-sig'
            }
        }).as('getExistingUser');

        cy.intercept('POST', '/api/auth/send-verification', {
            statusCode: 200,
            body: { success: true }
        }).as('sendVerification');

        mount(<GoogleCallbackPage />);

        cy.wait('@googleCallback');
        cy.wait('@getExistingUser');
        cy.get('[data-testid="loader-message"]').should('contain', 'Loading your encryption keys');
        
        cy.wait('@sendVerification');
        cy.get('@routerPush').should('have.been.calledWith', '/auth/verify-email?email=existing@gmail.com&userId=existing-user-789');
        });

        it('should handle user creation failure', () => {
        cy.intercept('POST', '/api/auth/google/callback', {
            statusCode: 200,
            body: {
            user: { id: 'google-fail', email: 'fail@gmail.com', name: 'Fail', verified_email: true },
            tokens: { access_token: 'token' }
            }
        }).as('googleCallback');

        cy.intercept('GET', '/api/users/by-google-id/google-fail', {
            statusCode: 404,
            body: { error: 'User not found' }
        }).as('getUserByGoogleId');

        cy.intercept('GET', '/api/users/by-email/fail@gmail.com', {
            statusCode: 404,
            body: { error: 'User not found' }
        }).as('getUserByEmail');

        cy.intercept('POST', '/api/users/google', {
            statusCode: 500,
            body: { error: 'Database error' }
        }).as('createUserFail');

        mount(<GoogleCallbackPage />);

        cy.wait('@googleCallback');
        cy.wait('@getUserByGoogleId');
        cy.wait('@getUserByEmail');
        cy.wait('@createUserFail');

        cy.get('@routerPush').should('have.been.calledWith', '/auth?error=authentication_failed');
        });
    });

    describe('State Management', () => {
        it('should set up encryption store for new users', () => {
        // Mock new user creation with crypto operations
        cy.intercept('POST', '/api/auth/google/callback', {
            statusCode: 200,
            body: {
            user: {
                id: 'google-crypto-123',
                email: 'crypto@gmail.com',
                name: 'Crypto User',
                verified_email: true
            },
            tokens: { access_token: 'token' }
            }
        }).as('googleCallback');

        cy.intercept('GET', '/api/users/by-google-id/google-crypto-123', {
            statusCode: 404,
            body: { error: 'User not found' }
        }).as('getUserByGoogleId');

        cy.intercept('GET', '/api/users/by-email/crypto@gmail.com', {
            statusCode: 404,
            body: { error: 'User not found' }
        }).as('getUserByEmail');

        cy.intercept('POST', '/api/users/google', {
            statusCode: 200,
            body: {
            id: 'crypto-user-456',
            email: 'crypto@gmail.com',
            username: 'Crypto User',
            google_id: 'google-crypto-123'
            }
        }).as('createUser');

        cy.intercept('POST', '/api/auth/send-verification', {
            statusCode: 200,
            body: { success: true }
        }).as('sendVerification');

        // Mock sodium library
        cy.window().then((win) => {
            win.sodium = {
            ready: Promise.resolve(),
            crypto_sign_keypair: () => ({
                privateKey: new Uint8Array(64),
                publicKey: new Uint8Array(32)
            }),
            crypto_box_keypair: () => ({
                privateKey: new Uint8Array(32),
                publicKey: new Uint8Array(32)
            }),
            crypto_sign_detached: () => new Uint8Array(64),
            randombytes_buf: (size) => new Uint8Array(size),
            crypto_pwhash: () => new Uint8Array(32),
            crypto_secretbox_easy: () => new Uint8Array(80),
            crypto_secretbox_open_easy: () => new Uint8Array(64),
            to_base64: (data) => 'base64-encoded-data',
            from_base64: (str) => new Uint8Array(32),
            crypto_pwhash_SALTBYTES: 32,
            crypto_secretbox_NONCEBYTES: 24,
            crypto_pwhash_OPSLIMIT_MODERATE: 3,
            crypto_pwhash_MEMLIMIT_MODERATE: 268435456,
            crypto_pwhash_ALG_DEFAULT: 2
            };
        });

        mount(<GoogleCallbackPage />);

        cy.wait('@googleCallback');
        cy.wait('@getUserByGoogleId');
        cy.wait('@getUserByEmail');
        cy.wait('@createUser');
        cy.wait('@sendVerification');

        // Should progress through crypto key generation
        cy.get('[data-testid="loader-message"]').should('contain', 'Verification email sent');
        });

        it('should clean up localStorage on success', () => {
        cy.intercept('POST', '/api/auth/google/callback', {
            statusCode: 200,
            body: {
            user: { id: 'cleanup-test', email: 'cleanup@gmail.com', name: 'Cleanup', verified_email: true },
            tokens: { access_token: 'token' }
            }
        }).as('googleCallback');

        cy.intercept('GET', '/api/users/by-google-id/cleanup-test', {
            statusCode: 200,
            body: {
            id: 'cleanup-user',
            email: 'cleanup@gmail.com',
            google_id: 'cleanup-test',
            ik_public: 'key', spk_public: 'key', opks_public: '[]',
            salt: 'salt', nonce: 'nonce', signedPrekeySignature: 'sig'
            }
        }).as('getUser');

        cy.intercept('POST', '/api/auth/send-verification', {
            statusCode: 200,
            body: { success: true }
        }).as('sendVerification');

        mount(<GoogleCallbackPage />);

        cy.wait('@googleCallback');
        cy.wait('@getUser');
        cy.wait('@sendVerification');

        // Verify localStorage cleanup
        cy.window().then((win) => {
            expect(win.localStorage.getItem('googleAuthInProgress')).to.be.null;
            expect(win.localStorage.getItem('googleAuthState')).to.be.null;
        });
        });

        it('should clean up localStorage on error', () => {
        cy.intercept('POST', '/api/auth/google/callback', {
            statusCode: 500,
            body: { error: 'Server error' }
        }).as('serverError');

        mount(<GoogleCallbackPage />);

        cy.wait('@serverError');

        // Should clean up even on error
        cy.window().then((win) => {
            expect(win.localStorage.getItem('googleAuthInProgress')).to.be.null;
            expect(win.localStorage.getItem('googleAuthState')).to.be.null;
        });
        });
    });

    describe('Error Boundary', () => {
        it('should handle unexpected JavaScript errors gracefully', () => {
        // Mock an error in the component
        cy.window().then((win) => {
            win.URLSearchParams = function() {
            throw new Error('Unexpected error');
            };
        });

        mount(<GoogleCallbackPage />);

        // Should show some error state or redirect
        cy.get('@routerPush').should('have.been.called');
        });

        it('should handle missing dependencies', () => {
        // Mock missing localStorage
        cy.window().then((win) => {
            delete win.localStorage;
        });

        mount(<GoogleCallbackPage />);

        // Should handle gracefully
        cy.get('[data-testid="loader"]').should('exist');
        });
    });

    afterEach(() => {
        cy.clearLocalStorage();
    });
});
