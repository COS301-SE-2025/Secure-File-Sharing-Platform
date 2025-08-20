describe('Avatar Display Integration Tests', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((window) => {
      window.localStorage.setItem('token', 'mock-token');
    });
  });

  describe('Sidebar Avatar Display', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard');
    });

    it('should display Google avatar for OAuth users', () => {
      // Mock user profile with Google avatar
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: '123',
            username: 'John Doe',
            email: 'john.doe@gmail.com',
            avatar_url: 'https://lh3.googleusercontent.com/test-avatar.jpg'
          }
        }
      }).as('getUserProfile');

      cy.wait('@getUserProfile');
      
      // Check that the avatar image is displayed
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('img[alt="Avatar"]').should('exist');
        cy.get('img[alt="Avatar"]').should('have.attr', 'src', 'https://lh3.googleusercontent.com/test-avatar.jpg');
      });
    });

    it('should display intelligent initials for regular users with complex usernames', () => {
      // Mock user profile without avatar
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: '123',
            username: 'S_Daniel',
            email: 'sdaniel@example.com',
            avatar_url: null
          }
        }
      }).as('getUserProfile');

      cy.wait('@getUserProfile');
      
      // Check that intelligent initials are displayed
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('div').contains('SD').should('exist');
        cy.get('img[alt="Avatar"]').should('not.exist');
      });
    });

    it('should handle usernames with underscores correctly', () => {
      const testCases = [
        { username: 'john_doe', expected: 'JD' },
        { username: 'user_name_test', expected: 'UN' },
        { username: 'a_b_c_d', expected: 'AB' },
        { username: 'single', expected: 'SI' }
      ];

      testCases.forEach((testCase, index) => {
        cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
          statusCode: 200,
          body: {
            success: true,
            data: {
              id: '123',
              username: testCase.username,
              email: 'test@example.com',
              avatar_url: null
            }
          }
        }).as(`getUserProfile${index}`);

        cy.reload();
        cy.wait(`@getUserProfile${index}`);
        
        cy.get('[data-testid="sidebar"]').within(() => {
          cy.get('div').contains(testCase.expected).should('exist');
        });
      });
    });
  });
});
