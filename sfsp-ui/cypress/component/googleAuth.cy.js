import AuthPage from '../../../app/auth/page';
import { mount } from 'cypress/react18';

describe('Google Authentication Component Tests', () => {
    beforeEach(() => {
        // Mock Next.js router
        cy.window().then((win) => {
        win.__NEXT_ROUTER_BASEPATH = '';
        
        // Mock useRouter hook
        const mockRouter = {
            push: cy.stub().as('routerPush'),
            replace: cy.stub().as('routerReplace'),
            back: cy.stub().as('routerBack'),
            pathname: '/auth',
            query: {},
            asPath: '/auth'
        };
        
        cy.stub(win, 'useRouter').returns(mockRouter);
        });

        // Mock environment variables
        cy.window().then((win) => {
        if (!win.process) win.process = {};
        if (!win.process.env) win.process.env = {};
        win.process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'mock-google-client-id';
        });
    });

    describe('Google Button Rendering', () => {
        it('should render Google sign-in button with correct styling', () => {
        mount(<AuthPage />);
        
        // Check if Google button exists
        cy.get('button').contains('Continue with Google').should('exist');
        
        // Verify button styling classes
        cy.get('button').contains('Continue with Google')
            .should('have.class', 'w-full')
            .should('have.class', 'flex')
            .should('have.class', 'items-center')
            .should('have.class', 'justify-center');
        
        // Verify Google SVG icon exists
        cy.get('button').contains('Continue with Google')
            .find('svg')
            .should('exist')
            .should('have.class', 'w-5')
            .should('have.class', 'h-5');
        
        // Verify all Google logo paths are present
        cy.get('button').contains('Continue with Google')
            .find('svg path')
            .should('have.length', 4); // Google logo has 4 colored sections
        });

        it('should show Google button on both login and signup tabs', () => {
        mount(<AuthPage />);
        
        // Check login tab (default)
        cy.get('button').contains('Continue with Google').should('be.visible');
        
        // Switch to signup tab
        cy.get('div').contains('Sign Up').click();
        
        // Check signup tab
        cy.get('button').contains('Continue with Google').should('be.visible');
        });

        it('should disable Google button when loading', () => {
        mount(<AuthPage />);
        
        // Initially enabled
        cy.get('button').contains('Continue with Google').should('not.be.disabled');
        
        // Simulate loading state by clicking (which sets isLoading to true)
        cy.get('button').contains('Continue with Google').click();
        
        // Should be disabled during loading
        cy.get('button').contains('Continue with Google').should('be.disabled');
        });
    });

    describe('Google OAuth Initialization', () => {
        it('should set loading state when Google button is clicked', () => {
        mount(<AuthPage />);
        
        // Mock crypto.randomUUID for state generation
        cy.window().then((win) => {
            win.crypto = {
            randomUUID: () => 'mock-uuid-123'
            };
        });
        
        // Click Google button
        cy.get('button').contains('Continue with Google').click();
        
        // Should show loader
        cy.get('[data-testid="loader"]').should('exist');
        cy.get('[data-testid="loader-message"]').should('contain', 'Redirecting to Google...');
        });

        it('should generate and store OAuth state', () => {
        mount(<AuthPage />);
        
        const mockUuid = 'test-state-uuid';
        
        cy.window().then((win) => {
            win.crypto = {
            randomUUID: () => mockUuid
            };
            
            // Mock localStorage
            win.localStorage = {
            setItem: cy.stub().as('setItem'),
            getItem: cy.stub().as('getItem'),
            removeItem: cy.stub().as('removeItem')
            };
        });
        
        cy.get('button').contains('Continue with Google').click();
        
        // Verify state was stored
        cy.get('@setItem').should('have.been.calledWith', 'googleAuthState', mockUuid);
        cy.get('@setItem').should('have.been.calledWith', 'googleAuthInProgress', 'true');
        });

        it('should construct correct Google OAuth URL', () => {
        mount(<AuthPage />);
        
        cy.window().then((win) => {
            win.crypto = {
            randomUUID: () => 'mock-state-123'
            };
            
            // Mock localStorage
            const mockLocalStorage = {
            setItem: cy.stub(),
            getItem: cy.stub().returns(null),
            removeItem: cy.stub()
            };
            win.localStorage = mockLocalStorage;
            
            // Capture window.location.href assignments
            let capturedUrl = '';
            Object.defineProperty(win.location, 'href', {
            set: (url) => { capturedUrl = url; },
            get: () => capturedUrl
            });
            
            cy.get('button').contains('Continue with Google').click().then(() => {
            // Verify the constructed URL
            expect(capturedUrl).to.include('https://accounts.google.com/o/oauth2/v2/auth');
            expect(capturedUrl).to.include('client_id=mock-google-client-id');
            expect(capturedUrl).to.include('redirect_uri=http%3A//localhost%3A3000/auth/google/callback');
            expect(capturedUrl).to.include('response_type=code');
            expect(capturedUrl).to.include('scope=openid%20email%20profile');
            expect(capturedUrl).to.include('state=mock-state-123');
            expect(capturedUrl).to.include('access_type=offline');
            expect(capturedUrl).to.include('prompt=consent');
            });
        });
        });

        it('should prevent multiple concurrent OAuth attempts', () => {
        mount(<AuthPage />);
        
        cy.window().then((win) => {
            win.localStorage = {
            setItem: cy.stub(),
            getItem: cy.stub().returns('true'), // Simulate auth in progress
            removeItem: cy.stub()
            };
            
            win.crypto = {
            randomUUID: () => 'mock-uuid'
            };
        });
        
        cy.get('button').contains('Continue with Google').click();
        
        // Should show warning message instead of initiating new auth
        cy.get('.bg-red-100').should('contain', 'Google authentication is already in progress');
        });
    });

    describe('Error Handling', () => {
        it('should handle OAuth errors from URL parameters', () => {
        // Mock URL search params
        cy.window().then((win) => {
            const mockSearchParams = new URLSearchParams('?error=oauth_error');
            Object.defineProperty(win.location, 'search', {
            value: '?error=oauth_error'
            });
            
            // Mock URLSearchParams
            win.URLSearchParams = function(search) {
            return {
                get: (key) => key === 'error' ? 'oauth_error' : null
            };
            };
        });
        
        mount(<AuthPage />);
        
        // Should display error message
        cy.get('.bg-red-100').should('contain', 'Google authentication was cancelled or failed');
        });

        it('should handle different OAuth error types', () => {
        const errorScenarios = [
            { error: 'oauth_cancelled', message: 'Google authentication was cancelled' },
            { error: 'missing_code', message: 'Google authentication failed. Missing authorization code' },
            { error: 'code_expired', message: 'Authorization code has expired' },
            { error: 'invalid_state', message: 'Invalid authentication state' }
        ];

        errorScenarios.forEach((scenario) => {
            cy.window().then((win) => {
            win.URLSearchParams = function(search) {
                return {
                get: (key) => key === 'error' ? scenario.error : null
                };
            };
            });
            
            mount(<AuthPage />);
            
            cy.get('.bg-red-100').should('contain', scenario.message);
        });
        });

        it('should clean up URL parameters after showing error', () => {
        cy.window().then((win) => {
            win.URLSearchParams = function(search) {
            return {
                get: (key) => key === 'error' ? 'oauth_error' : null
            };
            };
            
            win.history = {
            replaceState: cy.stub().as('replaceState')
            };
            
            Object.defineProperty(win.location, 'pathname', {
            value: '/auth'
            });
        });
        
        mount(<AuthPage />);
        
        // Should clean up URL
        cy.get('@replaceState').should('have.been.calledWith', {}, '', '/auth');
        });

        it('should handle missing Google Client ID', () => {
        cy.window().then((win) => {
            // Remove Google Client ID
            if (win.process?.env) {
            delete win.process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
            }
            
            win.localStorage = {
            setItem: cy.stub(),
            getItem: cy.stub().returns(null),
            removeItem: cy.stub().as('removeItem')
            };
        });
        
        mount(<AuthPage />);
        
        cy.get('button').contains('Continue with Google').click();
        
        // Should handle gracefully and clean up
        cy.get('@removeItem').should('have.been.calledWith', 'googleAuthInProgress');
        });
    });

    describe('Integration with Form State', () => {
        it('should not interfere with regular login form', () => {
        mount(<AuthPage />);
        
        // Fill login form
        cy.get('input[name="email"]').type('test@example.com');
        cy.get('input[name="password"]').type('password123');
        
        // Click Google button
        cy.get('button').contains('Continue with Google').click();
        
        // Form values should be preserved if user cancels Google auth
        cy.get('input[name="email"]').should('have.value', 'test@example.com');
        cy.get('input[name="password"]').should('have.value', 'password123');
        });

        it('should not interfere with signup form validation', () => {
        mount(<AuthPage />);
        
        // Switch to signup
        cy.get('div').contains('Sign Up').click();
        
        // Fill form partially
        cy.get('input[name="name"]').type('Test User');
        cy.get('input[name="email"]').type('test@example.com');
        
        // Click Google button
        cy.get('button').contains('Continue with Google').click();
        
        // Form values should be preserved
        cy.get('input[name="name"]').should('have.value', 'Test User');
        cy.get('input[name="email"]').should('have.value', 'test@example.com');
        });

        it('should clear error messages when Google auth is initiated', () => {
        mount(<AuthPage />);
        
        // Create an error state first
        cy.window().then((win) => {
            win.URLSearchParams = function(search) {
            return {
                get: (key) => key === 'error' ? 'oauth_error' : null
            };
            };
        });
        
        // Remount to show error
        mount(<AuthPage />);
        cy.get('.bg-red-100').should('exist');
        
        // Click Google button should clear error
        cy.get('button').contains('Continue with Google').click();
        cy.get('.bg-red-100').should('not.exist');
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels and keyboard navigation', () => {
        mount(<AuthPage />);
        
        // Check button accessibility
        cy.get('button').contains('Continue with Google')
            .should('have.attr', 'type', 'button')
            .should('be.visible');
        
        // Should be keyboard accessible
        cy.get('button').contains('Continue with Google')
            .focus()
            .should('have.focus');
        
        // Should activate on Enter key
        cy.get('button').contains('Continue with Google')
            .focus()
            .type('{enter}');
        
        // Should show loading state
        cy.get('[data-testid="loader"]').should('exist');
        });

        it('should maintain focus management during state changes', () => {
        mount(<AuthPage />);
        
        // Focus on Google button
        cy.get('button').contains('Continue with Google').focus();
        
        // Switch tabs
        cy.get('div').contains('Sign Up').click();
        
        // Google button should still be focusable
        cy.get('button').contains('Continue with Google')
            .focus()
            .should('have.focus');
        });
    });
});
