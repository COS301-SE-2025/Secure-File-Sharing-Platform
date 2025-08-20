describe('End-to-End User Journey Integration Tests', () => {
  describe('Complete User Registration and Dashboard Flow', () => {
    it('should complete full user journey: registration → verification → login → dashboard → file operations', () => {
      // Step 1: User Registration
      cy.visit('http://localhost:3000/auth');
      
      // Mock registration API
      cy.intercept('POST', 'http://localhost:5000/api/users/register', {
        statusCode: 200,
        body: {
          success: true,
          message: "User registered successfully.",
          data: {
            token: 'Bearer registration-token',
            user: {
              id: 'new-user-123',
              email: 'newuser@example.com',
              username: 'New_User',
              is_verified: true
            },
          },
        },
      }).as('registerUser');

      cy.intercept('POST', 'http://localhost:5000/api/files/addUser', {
        statusCode: 200,
        body: { success: true }
      }).as('addUserToFiles');

      // Switch to signup form
      cy.get("div").contains("Sign Up").click();

      // Fill registration form
      cy.get('input[name="name"]').type('New_User');
      cy.get('input[name="email"]').type('newuser@example.com');
      cy.get('input[name="password"]').type('StrongPassword123!');
      cy.wait(500); // Wait for password validation
      cy.get('input[name="confirmPassword"]').should('not.be.disabled').type('StrongPassword123!');
      
      // Submit registration
      cy.get('button[type="submit"]').click();
      
      cy.wait('@registerUser');
      cy.wait('@addUserToFiles');

      // Should redirect to dashboard after successful registration
      cy.url({ timeout: 10000 }).should('include', '/dashboard');

      // Step 2: Dashboard should load with user profile
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'new-user-123',
            username: 'New_User',
            email: 'newuser@example.com',
            avatar_url: null,
            is_verified: true
          }
        }
      }).as('getUserProfile');

      // Mock empty files initially
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: []
      }).as('getFiles');

      cy.wait('@getUserProfile');
      cy.wait('@getFiles');

      // Verify dashboard loaded correctly
      cy.get('h1').contains('Dashboard').should('be.visible');
      cy.get('[data-testid="sidebar"]').should('be.visible');
      
      // Verify user avatar shows correct initials (New_User -> NU)
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('div').contains('NU').should('be.visible');
        cy.get('div').contains('New_User').should('be.visible');
      });

      // Step 3: File Upload
      cy.intercept('POST', 'http://localhost:5000/api/files/upload', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            fileId: 'uploaded-file-123',
            fileName: 'test-document.pdf',
            message: 'File uploaded successfully'
          }
        }
      }).as('uploadFile');

      // Click upload button
      cy.get('button').contains('Upload').click();
      cy.get('div').contains('Upload Files').should('be.visible');

      // Simulate file upload
      const fileName = 'test-document.pdf';
      const fileContent = 'PDF content here';
      
      cy.get('input[type="file"]').then(input => {
        const blob = new Blob([fileContent], { type: 'application/pdf' });
        const file = new File([blob], fileName, { type: 'application/pdf' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input[0].files = dataTransfer.files;
        
        cy.wrap(input).trigger('change', { force: true });
      });

      // Step 4: Navigate to My Files
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('a[href="/dashboard/myFilesV2"]').click();
      });

      cy.url().should('include', '/dashboard/myFilesV2');

      // Mock files for My Files page
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: [
          {
            fileId: 'uploaded-file-123',
            fileName: 'test-document.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
            uploadTime: new Date().toISOString(),
            tags: 'important,work'
          }
        ]
      }).as('getFilesWithData');

      cy.wait('@getFilesWithData');

      // Verify file appears in list
      cy.get('div').contains('test-document.pdf').should('be.visible');

      // Step 5: Check Access Logs
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('a[href="/dashboard/accessLogs"]').click();
      });

      cy.url().should('include', '/dashboard/accessLogs');

      // Mock access logs
      cy.intercept('POST', 'http://localhost:5000/api/files/getAccesslog', {
        statusCode: 200,
        body: [
          {
            file_id: 'uploaded-file-123',
            user_id: 'new-user-123',
            action: 'Created',
            timestamp: new Date().toISOString()
          }
        ]
      }).as('getAccessLogs');

      cy.intercept('GET', 'http://localhost:5000/api/users/getUserInfo/new-user-123', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            username: 'New_User',
            email: 'newuser@example.com',
            avatar_url: null
          }
        }
      }).as('getUserInfo');

      cy.wait(['@getFilesWithData', '@getAccessLogs', '@getUserInfo']);

      // Verify access log shows with correct avatar initials
      cy.get('table tbody tr').should('have.length', 1);
      cy.get('table tbody tr').first().within(() => {
        cy.get('div').contains('NU').should('be.visible'); // New_User -> NU
        cy.get('div').contains('New_User').should('be.visible');
        cy.get('td').contains('Created').should('be.visible');
      });

      // Step 6: Test Settings and Theme Toggle
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('[data-testid="settings-dropdown"]').click();
        
        // Test theme toggle
        cy.get('button').contains('Dark Mode').then($btn => {
          if ($btn.length > 0) {
            cy.wrap($btn).click();
          }
        });
      });

      // Step 7: Test Logout
      cy.get('[data-testid="profile-button"]').click();
      cy.get('button').contains('Logout').click();

      // Should clear localStorage
      cy.window().then((window) => {
        expect(window.localStorage.getItem('token')).to.be.null;
      });

      // Should redirect to auth page
      cy.url({ timeout: 5000 }).should('include', '/');
    });
  });

  describe('Google OAuth User Journey', () => {
    it('should handle Google OAuth user with avatar display', () => {
      // Mock Google OAuth callback
      cy.visit('http://localhost:3000/auth/google/callback?code=mock-auth-code&state=mock-state');

      // Set up session storage for OAuth state
      cy.window().then((window) => {
        window.sessionStorage.setItem('googleOAuthState', 'mock-state');
      });

      // Mock Google OAuth user info API
      cy.intercept('GET', '/api/auth/google*', {
        statusCode: 200,
        body: {
          user: {
            id: 'google-user-123',
            email: 'google.user@gmail.com',
            name: 'Google User',
            picture: 'https://lh3.googleusercontent.com/test-avatar.jpg'
          }
        }
      }).as('getGoogleUserInfo');

      // Mock existing user check
      cy.intercept('GET', 'http://localhost:5000/api/users/getUserId/google.user@gmail.com', {
        statusCode: 200,
        body: {
          success: true,
          data: { userId: 'existing-google-user' }
        }
      }).as('checkUserExists');

      // Mock Google auth login
      cy.intercept('POST', 'http://localhost:5000/api/users/google-auth', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            user: {
              id: 'existing-google-user',
              email: 'google.user@gmail.com',
              username: 'Google User',
              avatar_url: 'https://lh3.googleusercontent.com/test-avatar.jpg',
              is_verified: true,
              salt: 'mock-salt',
              nonce: 'mock-nonce',
              ik_public: 'mock-ik',
              spk_public: 'mock-spk',
              signedPrekeySignature: 'mock-signature',
              opks_public: []
            },
            keyBundle: {
              ik_private_key: 'mock-ik-private',
              spk_private_key: 'mock-spk-private',
              opks_private: []
            },
            token: 'Bearer google-auth-token'
          }
        }
      }).as('googleAuthLogin');

      cy.intercept('POST', 'http://localhost:5000/api/files/addUser', {
        statusCode: 200,
        body: { success: true }
      }).as('addGoogleUser');

      cy.wait(['@getGoogleUserInfo', '@checkUserExists', '@googleAuthLogin', '@addGoogleUser']);

      // Should redirect to dashboard
      cy.url({ timeout: 10000 }).should('include', '/dashboard');

      // Mock profile for dashboard
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'existing-google-user',
            username: 'Google User',
            email: 'google.user@gmail.com',
            avatar_url: 'https://lh3.googleusercontent.com/test-avatar.jpg'
          }
        }
      }).as('getGoogleUserProfile');

      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: []
      }).as('getFiles');

      cy.wait(['@getGoogleUserProfile', '@getFiles']);

      // Verify Google avatar is displayed
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('img[alt="Avatar"]').should('exist');
        cy.get('img[alt="Avatar"]').should('have.attr', 'src', 'https://lh3.googleusercontent.com/test-avatar.jpg');
        cy.get('div').contains('Google User').should('be.visible');
      });

      // Test access logs with Google user
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('a[href="/dashboard/accessLogs"]').click();
      });

      // Mock access logs with Google user
      cy.intercept('POST', 'http://localhost:5000/api/files/getAccesslog', {
        statusCode: 200,
        body: [
          {
            file_id: 'file1',
            user_id: 'existing-google-user',
            action: 'Logged In',
            timestamp: new Date().toISOString()
          }
        ]
      }).as('getGoogleAccessLogs');

      cy.intercept('GET', 'http://localhost:5000/api/users/getUserInfo/existing-google-user', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            username: 'Google User',
            email: 'google.user@gmail.com',
            avatar_url: 'https://lh3.googleusercontent.com/test-avatar.jpg'
          }
        }
      }).as('getGoogleUserInfo2');

      cy.wait(['@getFiles', '@getGoogleAccessLogs', '@getGoogleUserInfo2']);

      // Verify Google avatar in access logs
      cy.get('table tbody tr').should('have.length', 1);
      cy.get('table tbody tr').first().within(() => {
        cy.get('img').should('have.attr', 'src', 'https://lh3.googleusercontent.com/test-avatar.jpg');
        cy.get('div').contains('Google User').should('be.visible');
      });
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle network errors gracefully throughout the user journey', () => {
      cy.visit('http://localhost:3000/dashboard');

      // Mock authentication
      cy.window().then((window) => {
        window.localStorage.setItem('token', 'mock-token');
      });

      // Mock network error for profile
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 500,
        body: { success: false, message: 'Server error' }
      }).as('getProfileError');

      cy.wait('@getProfileError');

      // Dashboard should still load with fallback state
      cy.get('[data-testid="sidebar"]').should('be.visible');
      cy.get('h1').contains('Dashboard').should('be.visible');

      // Test files API error
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 500,
        body: { success: false, message: 'Server error' }
      }).as('getFilesError');

      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('a[href="/dashboard/myFilesV2"]').click();
      });

      cy.wait('@getFilesError');

      // Page should handle error gracefully
      cy.url().should('include', '/dashboard/myFilesV2');
    });

    it('should handle various username edge cases in real user flow', () => {
      const edgeCaseUsers = [
        { username: '123_456_789', expected: '12' }, // Numbers fallback
        { username: 'user_with_many_underscores_here', expected: 'UW' },
        { username: 'single', expected: 'SI' },
        { username: 'a_b', expected: 'AB' }
      ];

      edgeCaseUsers.forEach((testUser, index) => {
        cy.visit('http://localhost:3000/dashboard');
        
        cy.window().then((window) => {
          window.localStorage.setItem('token', 'mock-token');
        });

        cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
          statusCode: 200,
          body: {
            success: true,
            data: {
              id: `user-${index}`,
              username: testUser.username,
              email: `user${index}@example.com`,
              avatar_url: null
            }
          }
        }).as(`getProfile${index}`);

        cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
          statusCode: 200,
          body: []
        }).as(`getFiles${index}`);

        cy.wait([`@getProfile${index}`, `@getFiles${index}`]);

        // Verify correct initials display
        cy.get('[data-testid="sidebar"]').within(() => {
          cy.get('div').contains(testUser.expected).should('be.visible');
        });

        // Test in access logs too
        cy.get('[data-testid="sidebar"]').within(() => {
          cy.get('a[href="/dashboard/accessLogs"]').click();
        });

        cy.intercept('POST', 'http://localhost:5000/api/files/getAccesslog', {
          statusCode: 200,
          body: [
            {
              file_id: 'file1',
              user_id: `user-${index}`,
              action: 'Test',
              timestamp: new Date().toISOString()
            }
          ]
        }).as(`getAccessLogs${index}`);

        cy.intercept('GET', `http://localhost:5000/api/users/getUserInfo/user-${index}`, {
          statusCode: 200,
          body: {
            success: true,
            data: {
              username: testUser.username,
              email: `user${index}@example.com`,
              avatar_url: null
            }
          }
        }).as(`getUserInfo${index}`);

        cy.wait([`@getFiles${index}`, `@getAccessLogs${index}`, `@getUserInfo${index}`]);

        // Verify initials in access logs
        cy.get('table tbody tr').first().within(() => {
          cy.get('div').contains(testUser.expected).should('be.visible');
        });
      });
    });
  });
});
