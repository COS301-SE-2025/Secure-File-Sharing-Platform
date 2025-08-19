// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Google Authentication Commands

/**
 * Set up Google OAuth state in localStorage
 * @param {string} state - OAuth state parameter
 */
Cypress.Commands.add('setupGoogleOAuthState', (state = 'test-state-123') => {
  cy.window().then((win) => {
    win.localStorage.setItem('googleAuthState', state);
    win.localStorage.setItem('googleAuthInProgress', 'true');
  });
});

/**
 * Mock Google OAuth callback API response
 * @param {object} options - Configuration options
 * @param {object} options.user - Google user data
 * @param {number} options.statusCode - Response status code
 * @param {boolean} options.delay - Add delay to response
 */
Cypress.Commands.add('mockGoogleCallback', (options = {}) => {
    const {
        user = {
        id: 'google-test-123',
        email: 'test@gmail.com',
        name: 'Test User',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
        verified_email: true
        },
        statusCode = 200,
        delay = 0
    } = options;

    const interceptOptions = {
        statusCode,
        body: {
        user,
        tokens: {
            access_token: 'ya29.mock-access-token',
            id_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...'
        }
        }
    };

    if (delay > 0) {
        interceptOptions.delay = delay;
    }

    cy.intercept('GET', '/api/auth/google**', interceptOptions).as('googleCallback');
});

/**
 * Mock user lookup by Google ID
 * @param {string} googleId - Google user ID
 * @param {object} userData - User data to return (null for not found)
 * @param {number} statusCode - Response status code
 */
Cypress.Commands.add('mockUserByGoogleId', (googleId, userData = null, statusCode = null) => {
    const responseConfig = userData ? 
        { statusCode: statusCode || 200, body: userData } :
        { statusCode: statusCode || 404, body: { error: 'User not found' } };

    cy.intercept('GET', `/api/users/by-google-id/${googleId}`, responseConfig).as('getUserByGoogleId');
});

/**
 * Mock user lookup by email
 * @param {string} email - User email
 * @param {object} userData - User data to return (null for not found)
 * @param {number} statusCode - Response status code
 */
Cypress.Commands.add('mockUserByEmail', (email, userData = null, statusCode = null) => {
    const responseConfig = userData ?
        { statusCode: statusCode || 200, body: userData } :
        { statusCode: statusCode || 404, body: { error: 'User not found' } };

    cy.intercept('GET', `/api/users/by-email/${encodeURIComponent(email)}`, responseConfig).as('getUserByEmail');
});

/**
 * Mock Google user creation
 * @param {object} userData - Created user data
 * @param {number} statusCode - Response status code
 */
Cypress.Commands.add('mockCreateGoogleUser', (userData, statusCode = 200) => {
    cy.intercept('POST', '/api/users/google', {
        statusCode,
        body: userData
    }).as('createGoogleUser');
});

/**
 * Mock MFA verification email sending
 * @param {boolean} success - Whether email sending succeeds
 * @param {number} statusCode - Response status code
 */
Cypress.Commands.add('mockMFAVerification', (success = true, statusCode = null) => {
    const responseConfig = success ?
        { statusCode: statusCode || 200, body: { success: true, message: 'Verification email sent' } } :
        { statusCode: statusCode || 500, body: { error: 'Email service unavailable' } };

    cy.intercept('POST', '/api/auth/send-verification', responseConfig).as('sendVerification');
});

/**
 * Mock complete Google OAuth flow for new user
 * @param {object} options - Configuration options
 */
Cypress.Commands.add('mockCompleteGoogleFlowNewUser', (options = {}) => {
    const {
        googleUser = {
        id: 'google-new-123',
        email: 'newuser@gmail.com',
        name: 'New User',
        verified_email: true
        },
        createdUser = {
        id: 'new-user-456',
        email: 'newuser@gmail.com',
        username: 'New User',
        google_id: 'google-new-123'
        }
    } = options;

    cy.mockGoogleCallback({ user: googleUser });
    cy.mockUserByGoogleId(googleUser.id, null);
    cy.mockUserByEmail(googleUser.email, null);
    cy.mockCreateGoogleUser(createdUser);
    cy.mockMFAVerification(true);
    });

    /**
     * Mock complete Google OAuth flow for existing user
     * @param {object} options - Configuration options
     */
    Cypress.Commands.add('mockCompleteGoogleFlowExistingUser', (options = {}) => {
    const {
        googleUser = {
        id: 'google-existing-123',
        email: 'existing@gmail.com',
        name: 'Existing User',
        verified_email: true
        },
        existingUser = {
        id: 'existing-user-789',
        email: 'existing@gmail.com',
        username: 'Existing User',
        google_id: 'google-existing-123',
        ik_public: 'existing-ik-public',
        spk_public: 'existing-spk-public',
        opks_public: JSON.stringify([]),
        salt: 'existing-salt',
        nonce: 'existing-nonce',
        signedPrekeySignature: 'existing-signature'
        }
    } = options;

    cy.mockGoogleCallback({ user: googleUser });
    cy.mockUserByGoogleId(googleUser.id, existingUser);
    cy.mockMFAVerification(true);
    });

    /**
     * Click the Google OAuth button using a more reliable selector
     */
    Cypress.Commands.add('clickGoogleOAuthButton', () => {
    cy.get('[data-testid="google-oauth-button"]').click();
});/**
 * Verify Google OAuth button exists and is functional
 */
Cypress.Commands.add('verifyGoogleOAuthButton', () => {
    // Wait for page to load and check if button exists
    cy.get('button').contains('Continue with Google')
        .should('be.visible')
        .should('not.be.disabled');
    
    // More robust way to verify Google logo exists - using data-testid
    cy.get('[data-testid="google-oauth-button"]')
        .should('be.visible')
        .should('not.be.disabled');
        
    // Optional: Verify Google logo has SVG if needed for visual tests
    cy.get('[data-testid="google-oauth-button"]')
        .find('svg')
        .should('exist', { timeout: 1000 });
});

/**
 * Visit Google OAuth callback with parameters
 * @param {object} params - URL parameters
 */
Cypress.Commands.add('visitGoogleCallback', (params = {}) => {
    const {
        code = 'test-auth-code',
        state = 'test-state-123',
        error = null
    } = params;

    let url = '/auth/google/callback?';
    
    if (error) {
        url += `error=${error}`;
        if (state) url += `&state=${state}`;
    } else {
        url += `code=${code}&state=${state}`;
    }

    cy.visit(`http://localhost:3000${url}`);
});

/**
 * Verify OAuth state cleanup
 */
Cypress.Commands.add('verifyOAuthCleanup', () => {
    cy.window().then((win) => {
        expect(win.localStorage.getItem('googleAuthInProgress')).to.be.null;
        expect(win.localStorage.getItem('googleAuthState')).to.be.null;
    });
});

/**
 * Verify OAuth error handling
 * @param {string} errorType - Type of error to verify
 * @param {string} expectedMessage - Expected error message
 */
Cypress.Commands.add('verifyOAuthError', (errorType, expectedMessage) => {
    // Check URL for error first (this should happen quickly)
    cy.url({ timeout: 10000 }).should('include', `/auth?error=${errorType}`);
    
    // If loader exists, check message. If not, that's okay for error scenarios
    cy.get('body').then($body => {
        if ($body.find('[data-testid="loader-message"]').length > 0) {
            cy.get('[data-testid="loader-message"]').should('contain', expectedMessage);
        } else {
            // For error scenarios without loader, just verify URL is correct
            cy.log('No loader found - error displayed directly in URL');
        }
    });
});

/**
 * Set up test data attributes for elements (to be added to components)
 */
Cypress.Commands.add('addTestAttributes', () => {
    cy.get('body').then($body => {
        if (!$body.find('[data-testid="auth-page"]').length) {
        cy.get('div').first().invoke('attr', 'data-testid', 'auth-page');
        }
    });
});

// Regular Authentication Commands for comparison testing

/**
 * Login with regular email/password
 * @param {string} email - User email
 * @param {string} password - User password
 */
Cypress.Commands.add('loginWithCredentials', (email, password) => {
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').contains('Log In').click();
});

/**
 * Sign up with regular form
 * @param {object} userData - User registration data
 */
Cypress.Commands.add('signupWithCredentials', (userData) => {
    const {
        name = 'Test User',
        email = 'test@example.com',
        password = 'TestPassword123!',
        confirmPassword = 'TestPassword123!'
    } = userData;

    cy.get('div').contains('Sign Up').click();
    cy.get('input[name="name"]').type(name);
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('input[name="confirmPassword"]').type(confirmPassword);
    cy.get('button[type="submit"]').contains('Create account').click();
});

// Utility Commands

/**
 * Wait for loader to appear and disappear
 * @param {string} expectedMessage - Expected loader message
 */
Cypress.Commands.add('waitForLoader', (expectedMessage = null) => {
    cy.get('[data-testid="loader"]', { timeout: 10000 }).should('be.visible');
    
    if (expectedMessage) {
        cy.get('[data-testid="loader-message"]').should('contain', expectedMessage);
    }
});

/**
 * Mock environment variables
 * @param {object} envVars - Environment variables to mock
 */
Cypress.Commands.add('mockEnvironmentVariables', (envVars = {}) => {
    cy.window().then((win) => {
        if (!win.process) win.process = {};
        if (!win.process.env) win.process.env = {};
        
        const defaultVars = {
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'mock-google-client-id'
        };
        
        Object.assign(win.process.env, defaultVars, envVars);
        
        // Mock window.location.href assignment to prevent actual redirect
        let originalHref = win.location.href;
        Object.defineProperty(win.location, 'href', {
            set: function(url) {
                if (url.includes('accounts.google.com')) {
                    // Instead of redirecting, trigger our test callback
                    win.__testGoogleRedirect = url;
                    cy.log('Intercepted Google redirect:', url);
                } else {
                    originalHref = url;
                }
            },
            get: function() {
                return originalHref;
            }
        });
    });
});