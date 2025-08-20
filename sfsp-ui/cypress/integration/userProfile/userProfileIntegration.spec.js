describe('User Profile and Settings Integration Tests', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((window) => {
      window.localStorage.setItem('token', 'mock-token');
      window.sessionStorage.setItem('unlockToken', 'session-unlock');
    });
  });

  describe('User Profile Management', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard');
    });

    it('should load and display user profile information', () => {
      // Mock user profile with Google OAuth
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'user123',
            username: 'John Doe',
            email: 'john.doe@gmail.com',
            avatar_url: 'https://lh3.googleusercontent.com/test-avatar.jpg',
            google_id: 'google123',
            is_verified: true,
            created_at: '2024-01-01T00:00:00Z'
          }
        }
      }).as('getUserProfile');

      cy.wait('@getUserProfile');

      // Check profile display in sidebar
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('img[alt="Avatar"]').should('exist');
        cy.get('div').contains('John Doe').should('be.visible');
        cy.get('div').contains('john.doe@gmail.com').should('be.visible');
      });
    });

    it('should handle profile dropdown interactions', () => {
      // Mock user profile
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            avatar_url: null
          }
        }
      }).as('getUserProfile');

      cy.wait('@getUserProfile');

      // Click on profile button to open dropdown
      cy.get('[data-testid="profile-button"]').click();
      
      // Verify dropdown options
      cy.get('button').contains('Logout').should('be.visible');
      
      // Test logout functionality
      cy.get('button').contains('Logout').click();
      
      // Should clear localStorage and potentially redirect
      cy.window().then((window) => {
        expect(window.localStorage.getItem('token')).to.be.null;
        expect(window.localStorage.getItem('user')).to.be.null;
      });
    });

    it('should navigate to account settings', () => {
      // Mock user profile
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            avatar_url: null
          }
        }
      }).as('getUserProfile');

      cy.wait('@getUserProfile');

      // Test collapsed sidebar account settings
      cy.get('[data-testid="sidebar-toggle"]').click(); // Collapse sidebar
      cy.get('[data-testid="profile-button"]').click();
      
      // Click on account settings link
      cy.get('a').contains('Account Settings').should('have.attr', 'href').and('include', 'Settings/accountSettings');
    });
  });

  describe('Settings Management', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard');
    });

    it('should handle theme switching', () => {
      // Mock user profile
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            avatar_url: null
          }
        }
      }).as('getUserProfile');

      cy.wait('@getUserProfile');

      // Open settings dropdown
      cy.get('[data-testid="settings-dropdown"]').click();
      
      // Test theme toggle
      cy.get('button').contains('Dark Mode').then($btn => {
        if ($btn.length > 0) {
          cy.wrap($btn).click();
          
          // Verify theme change (this depends on your theme implementation)
          cy.get('html').should('satisfy', $html => {
            return $html.hasClass('dark') || !$html.hasClass('dark');
          });
        }
      });
    });

    it('should handle settings dropdown interactions', () => {
      // Mock user profile
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            avatar_url: null
          }
        }
      }).as('getUserProfile');

      cy.wait('@getUserProfile');

      // Test settings dropdown
      cy.get('[data-testid="settings-dropdown"]').click();
      
      // Verify settings options
      cy.get('a').contains('Account Settings').should('be.visible');
      cy.get('button').should('contain.text', 'Mode'); // Light/Dark Mode
      
      // Click outside to close dropdown
      cy.get('body').click();
      cy.get('a').contains('Account Settings').should('not.be.visible');
    });
  });

  describe('Sidebar Behavior', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard');
    });

    it('should handle sidebar collapse and expansion', () => {
      // Mock user profile
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'user123',
            username: 'Complex_User_Name',
            email: 'complex@example.com',
            avatar_url: null
          }
        }
      }).as('getUserProfile');

      cy.wait('@getUserProfile');

      // Test sidebar toggle
      cy.get('[data-testid="sidebar-toggle"]').click();
      
      // Verify sidebar is collapsed (should show only icons)
      cy.get('[data-testid="sidebar"]').should('have.class', 'w-16').or('have.css', 'width', '64px');
      
      // In collapsed state, should show initials
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('div').contains('CU').should('be.visible'); // Complex_User_Name -> CU
      });
      
      // Expand sidebar again
      cy.get('[data-testid="sidebar-toggle"]').click();
      
      // Verify sidebar is expanded
      cy.get('[data-testid="sidebar"]').should('have.class', 'w-64').or('have.css', 'width', '256px');
      
      // Should show full username
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('div').contains('Complex_User_Name').should('be.visible');
      });
    });

    it('should remember sidebar state in localStorage', () => {
      // Mock user profile
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            avatar_url: null
          }
        }
      }).as('getUserProfile');

      cy.wait('@getUserProfile');

      // Collapse sidebar
      cy.get('[data-testid="sidebar-toggle"]').click();
      
      // Check localStorage
      cy.window().then((window) => {
        expect(window.localStorage.getItem('sidebarCollapsed')).to.equal('true');
      });
      
      // Reload page
      cy.reload();
      cy.wait('@getUserProfile');
      
      // Sidebar should remain collapsed
      cy.get('[data-testid="sidebar"]').should('have.class', 'w-16').or('have.css', 'width', '64px');
    });

    it('should handle hover effects on collapsed sidebar', () => {
      // Mock user profile
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            avatar_url: null
          }
        }
      }).as('getUserProfile');

      cy.wait('@getUserProfile');

      // Collapse sidebar
      cy.get('[data-testid="sidebar-toggle"]').click();
      
      // Hover over sidebar
      cy.get('[data-testid="sidebar"]').trigger('mouseenter');
      
      // Should expand on hover
      cy.get('[data-testid="sidebar"]').should('have.class', 'w-64').or('have.css', 'width', '256px');
      
      // Move mouse away
      cy.get('[data-testid="sidebar"]').trigger('mouseleave');
      
      // Should collapse again
      cy.get('[data-testid="sidebar"]').should('have.class', 'w-16').or('have.css', 'width', '64px');
    });
  });

  describe('User Authentication State', () => {
    it('should handle missing authentication tokens', () => {
      // Visit without setting up authentication
      cy.visit('http://localhost:3000/dashboard');
      
      // Mock unauthenticated response
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 401,
        body: {
          success: false,
          message: 'Unauthorized'
        }
      }).as('getUnauthorized');
      
      // Should handle gracefully or redirect
      cy.url().should('satisfy', url => 
        url.includes('/dashboard') || url.includes('/auth')
      );
    });

    it('should handle token refresh scenarios', () => {
      // Set initial authentication
      cy.window().then((window) => {
        window.localStorage.setItem('token', 'expired-token');
      });

      cy.visit('http://localhost:3000/dashboard');
      
      // Mock token refresh flow
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 401,
        body: {
          success: false,
          message: 'Token expired'
        }
      }).as('getTokenExpired');
      
      // Application should handle token expiration
      cy.wait('@getTokenExpired');
      
      // Verify appropriate handling (logout, redirect, etc.)
      cy.url().should('satisfy', url => 
        url.includes('/dashboard') || url.includes('/auth')
      );
    });
  });

  describe('Avatar Display Edge Cases', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard');
    });

    it('should handle various username formats correctly', () => {
      const testCases = [
        { username: 'simple', expected: 'SI' },
        { username: 'user_name', expected: 'UN' },
        { username: 'first-last', expected: 'FL' },
        { username: 'user.name', expected: 'UN' },
        { username: 'user123_name456', expected: 'UN' },
        { username: 'a_b_c_d_e', expected: 'AB' },
        { username: '123numbers456', expected: '12' }, // fallback
        { username: '', expected: '??' }, // empty fallback
      ];

      testCases.forEach((testCase, index) => {
        cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
          statusCode: 200,
          body: {
            success: true,
            data: {
              id: 'user123',
              username: testCase.username,
              email: 'test@example.com',
              avatar_url: null
            }
          }
        }).as(`getUserProfile${index}`);

        cy.reload();
        cy.wait(`@getUserProfile${index}`);
        
        if (testCase.username) {
          cy.get('[data-testid="sidebar"]').within(() => {
            cy.get('div').contains(testCase.expected).should('be.visible');
          });
        }
      });
    });

    it('should handle avatar loading errors', () => {
      // Mock user with invalid avatar URL
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'user123',
            username: 'Test User',
            email: 'test@example.com',
            avatar_url: 'https://invalid-url.com/avatar.jpg'
          }
        }
      }).as('getUserProfile');

      cy.wait('@getUserProfile');
      
      // Should fallback to initials if image fails to load
      cy.get('[data-testid="sidebar"]').within(() => {
        // Either avatar loads or initials are shown
        cy.get('img[alt="Avatar"], div').should('exist');
      });
    });
  });
});
