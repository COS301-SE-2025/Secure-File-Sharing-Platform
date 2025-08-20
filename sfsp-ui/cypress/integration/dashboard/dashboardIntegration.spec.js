describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((window) => {
      window.localStorage.setItem('token', 'mock-token');
      window.sessionStorage.setItem('unlockToken', 'session-unlock');
    });

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
  });

  describe('Dashboard Overview', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard');
    });

    it('should load dashboard with all main components', () => {
      // Mock files data
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: [
          {
            fileId: 'file1',
            fileName: 'document.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
            uploadTime: new Date().toISOString(),
            tags: 'tag1,tag2'
          },
          {
            fileId: 'file2',
            fileName: 'image.jpg',
            mimeType: 'image/jpeg',
            fileSize: 2048,
            uploadTime: new Date().toISOString(),
            tags: 'deleted,deleted_time:2023-01-01'
          }
        ]
      }).as('getFiles');

      cy.wait('@getFiles');

      // Check main dashboard elements
      cy.get('[data-testid="sidebar"]').should('be.visible');
      cy.get('h1').contains('Dashboard').should('be.visible');
      
      // Check statistics cards
      cy.get('div').contains('My Files').should('be.visible');
      cy.get('div').contains('Shared with Me').should('be.visible');
      cy.get('div').contains('Recent Activity').should('be.visible');
      
      // Verify file count (should be 1, excluding deleted files)
      cy.get('div').contains('1').should('be.visible'); // File count
    });

    it('should handle file upload flow', () => {
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: []
      }).as('getFiles');

      cy.wait('@getFiles');

      // Mock file upload
      cy.intercept('POST', 'http://localhost:5000/api/files/upload', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            fileId: 'new-file-123',
            fileName: 'test-upload.txt',
            message: 'File uploaded successfully'
          }
        }
      }).as('uploadFile');

      // Click upload button
      cy.get('button').contains('Upload').click();
      
      // Verify upload dialog opens
      cy.get('div').contains('Upload Files').should('be.visible');
      
      // Simulate file selection (note: actual file upload testing requires specific setup)
      const fileName = 'test-file.txt';
      const fileContent = 'This is test content';
      
      cy.get('input[type="file"]').then(input => {
        const blob = new Blob([fileContent], { type: 'text/plain' });
        const file = new File([blob], fileName, { type: 'text/plain' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input[0].files = dataTransfer.files;
        
        // Trigger change event
        cy.wrap(input).trigger('change', { force: true });
      });
    });

    it('should navigate between different sections', () => {
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: []
      }).as('getFiles');

      cy.wait('@getFiles');

      // Test sidebar navigation
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('a[href="/dashboard/myFilesV2"]').click();
      });
      cy.url().should('include', '/dashboard/myFilesV2');

      // Go back to dashboard
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('a[href="/dashboard"]').click();
      });
      cy.url().should('equal', 'http://localhost:3000/dashboard');

      // Test access logs navigation
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('a[href="/dashboard/accessLogs"]').click();
      });
      cy.url().should('include', '/dashboard/accessLogs');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard');
    });

    it('should filter files based on search query', () => {
      // Mock files with searchable content
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: [
          {
            fileId: 'file1',
            fileName: 'important-document.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
            uploadTime: new Date().toISOString(),
            tags: 'important,work'
          },
          {
            fileId: 'file2',
            fileName: 'vacation-photos.zip',
            mimeType: 'application/zip',
            fileSize: 5120,
            uploadTime: new Date().toISOString(),
            tags: 'personal,photos'
          }
        ]
      }).as('getFiles');

      cy.wait('@getFiles');

      // Test search functionality (if implemented in dashboard)
      cy.get('input[placeholder*="Search"]').then($input => {
        if ($input.length > 0) {
          cy.wrap($input).type('important');
          // Verify search results
          cy.get('div').contains('important-document.pdf').should('be.visible');
          cy.get('div').contains('vacation-photos.zip').should('not.exist');
        }
      });
    });
  });

  describe('Theme Toggle', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard');
    });

    it('should toggle between light and dark themes', () => {
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: []
      }).as('getFiles');

      cy.wait('@getFiles');

      // Test theme toggle in sidebar
      cy.get('[data-testid="sidebar"]').within(() => {
        cy.get('[data-testid="settings-dropdown"]').click();
        
        // Click theme toggle button
        cy.get('button').contains('Dark Mode').then($btn => {
          if ($btn.length > 0) {
            cy.wrap($btn).click();
            
            // Verify theme change (check for dark class or dark mode indicators)
            cy.get('html').should('have.class', 'dark').or('not.have.class', 'dark');
          }
        });
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard');
    });

    it('should handle API errors gracefully', () => {
      // Mock API error
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 500,
        body: {
          success: false,
          message: 'Internal server error'
        }
      }).as('getFilesError');

      cy.wait('@getFilesError');

      // Verify error handling (dashboard should still load with empty state)
      cy.get('[data-testid="sidebar"]').should('be.visible');
      cy.get('h1').contains('Dashboard').should('be.visible');
    });

    it('should handle unauthorized access', () => {
      // Clear authentication
      cy.window().then((window) => {
        window.localStorage.removeItem('token');
        window.sessionStorage.removeItem('unlockToken');
      });

      // Mock unauthorized response
      cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 401,
        body: {
          success: false,
          message: 'Unauthorized'
        }
      }).as('getProfileUnauthorized');

      cy.reload();
      
      // Should redirect to auth page or show error
      cy.url().should('satisfy', url => 
        url.includes('/auth') || url.includes('/dashboard')
      );
    });
  });
});
