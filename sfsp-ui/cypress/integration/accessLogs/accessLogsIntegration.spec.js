describe('Access Logs Integration Tests', () => {
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

  describe('Access Logs Page Load', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard/accessLogs');
    });

    it('should load access logs page with all components', () => {
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
            tags: 'important'
          }
        ]
      }).as('getFiles');

      // Mock access logs
      cy.intercept('POST', 'http://localhost:5000/api/files/getAccesslog', {
        statusCode: 200,
        body: [
          {
            file_id: 'file1',
            user_id: 'user1',
            action: 'Viewed',
            timestamp: new Date().toISOString()
          },
          {
            file_id: 'file1',
            user_id: 'user2',
            action: 'Downloaded',
            timestamp: new Date(Date.now() - 86400000).toISOString() // 1 day ago
          }
        ]
      }).as('getAccessLogs');

      // Mock user info for different users
      cy.intercept('GET', 'http://localhost:5000/api/users/getUserInfo/user1', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            username: 'John_Doe',
            email: 'john.doe@example.com',
            avatar_url: 'https://example.com/avatar1.jpg'
          }
        }
      }).as('getUserInfo1');

      cy.intercept('GET', 'http://localhost:5000/api/users/getUserInfo/user2', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            username: 'S_Daniel',
            email: 's.daniel@example.com',
            avatar_url: null
          }
        }
      }).as('getUserInfo2');

      cy.wait(['@getFiles', '@getAccessLogs', '@getUserInfo1', '@getUserInfo2']);

      // Verify page elements
      cy.get('h1').contains('Access Logs').should('be.visible');
      cy.get('p').contains('Monitor who accessed').should('be.visible');
      
      // Verify filters
      cy.get('select').contains('Last 7 days').should('be.visible');
      cy.get('select').contains('All actions').should('be.visible');
      
      // Verify export button
      cy.get('button').contains('Export logs').should('be.visible');
      
      // Verify table headers
      cy.get('table thead th').should('contain', 'User');
      cy.get('table thead th').should('contain', 'Action');
      cy.get('table thead th').should('contain', 'File');
      cy.get('table thead th').should('contain', 'Date');
    });

    it('should display log entries with correct avatar handling', () => {
      // Mock files data
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: [
          {
            fileId: 'file1',
            fileName: 'test-document.pdf',
            mimeType: 'application/pdf',
            fileSize: 1024,
            uploadTime: new Date().toISOString(),
            tags: 'work'
          }
        ]
      }).as('getFiles');

      // Mock access logs
      cy.intercept('POST', 'http://localhost:5000/api/files/getAccesslog', {
        statusCode: 200,
        body: [
          {
            file_id: 'file1',
            user_id: 'user1',
            action: 'Downloaded',
            timestamp: new Date().toISOString()
          }
        ]
      }).as('getAccessLogs');

      // Mock user with no avatar (should show initials)
      cy.intercept('GET', 'http://localhost:5000/api/users/getUserInfo/user1', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            username: 'Test_User_Name',
            email: 'test@example.com',
            avatar_url: null
          }
        }
      }).as('getUserInfo');

      cy.wait(['@getFiles', '@getAccessLogs', '@getUserInfo']);

      // Verify log entry with initials
      cy.get('table tbody tr').should('have.length', 1);
      cy.get('table tbody tr').first().within(() => {
        // Should show "TU" for "Test_User_Name"
        cy.get('div').contains('TU').should('be.visible');
        cy.get('div').contains('Test_User_Name').should('be.visible');
        cy.get('div').contains('test@example.com').should('be.visible');
        cy.get('td').contains('Downloaded').should('be.visible');
        cy.get('td').contains('test-document.pdf').should('be.visible');
      });
    });
  });

  describe('Filtering Functionality', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard/accessLogs');
    });

    it('should filter logs by action type', () => {
      // Mock files and logs data
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: [
          {
            fileId: 'file1',
            fileName: 'document.pdf',
            mimeType: 'application/pdf',
            uploadTime: new Date().toISOString(),
            tags: 'work'
          }
        ]
      }).as('getFiles');

      cy.intercept('POST', 'http://localhost:5000/api/files/getAccesslog', {
        statusCode: 200,
        body: [
          {
            file_id: 'file1',
            user_id: 'user1',
            action: 'Viewed',
            timestamp: new Date().toISOString()
          },
          {
            file_id: 'file1',
            user_id: 'user1',
            action: 'Downloaded',
            timestamp: new Date().toISOString()
          },
          {
            file_id: 'file1',
            user_id: 'user1',
            action: 'Shared',
            timestamp: new Date().toISOString()
          }
        ]
      }).as('getAccessLogs');

      cy.intercept('GET', 'http://localhost:5000/api/users/getUserInfo/user1', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            username: 'testuser',
            email: 'test@example.com',
            avatar_url: null
          }
        }
      }).as('getUserInfo');

      cy.wait(['@getFiles', '@getAccessLogs', '@getUserInfo']);

      // Initially should show all logs
      cy.get('table tbody tr').should('have.length', 3);

      // Filter by "Downloaded"
      cy.get('select').eq(1).select('Downloaded');
      cy.get('table tbody tr').should('have.length', 1);
      cy.get('table tbody tr').first().should('contain', 'Downloaded');

      // Filter by "Viewed"
      cy.get('select').eq(1).select('Viewed');
      cy.get('table tbody tr').should('have.length', 1);
      cy.get('table tbody tr').first().should('contain', 'Viewed');

      // Back to all actions
      cy.get('select').eq(1).select('All actions');
      cy.get('table tbody tr').should('have.length', 3);
    });

    it('should filter logs by date range', () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Mock files and logs with different timestamps
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: [
          {
            fileId: 'file1',
            fileName: 'document.pdf',
            mimeType: 'application/pdf',
            uploadTime: now.toISOString(),
            tags: 'work'
          }
        ]
      }).as('getFiles');

      cy.intercept('POST', 'http://localhost:5000/api/files/getAccesslog', {
        statusCode: 200,
        body: [
          {
            file_id: 'file1',
            user_id: 'user1',
            action: 'Viewed',
            timestamp: now.toISOString()
          },
          {
            file_id: 'file1',
            user_id: 'user1',
            action: 'Downloaded',
            timestamp: weekAgo.toISOString()
          },
          {
            file_id: 'file1',
            user_id: 'user1',
            action: 'Shared',
            timestamp: monthAgo.toISOString()
          }
        ]
      }).as('getAccessLogs');

      cy.intercept('GET', 'http://localhost:5000/api/users/getUserInfo/user1', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            username: 'testuser',
            email: 'test@example.com',
            avatar_url: null
          }
        }
      }).as('getUserInfo');

      cy.wait(['@getFiles', '@getAccessLogs', '@getUserInfo']);

      // Test different date filters
      cy.get('select').eq(0).select('Last 7 days');
      cy.get('table tbody tr').should('have.length.at.most', 2); // Recent entries only

      cy.get('select').eq(0).select('Last 30 days');
      cy.get('table tbody tr').should('have.length.at.most', 3); // More entries

      cy.get('select').eq(0).select('All time');
      cy.get('table tbody tr').should('have.length', 3); // All entries
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard/accessLogs');
    });

    it('should show export options on hover', () => {
      // Mock basic data
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: []
      }).as('getFiles');

      cy.wait('@getFiles');

      // Hover over export button
      cy.get('button').contains('Export logs').trigger('mouseover');
      
      // Should show export options
      cy.get('button').contains('CSV').should('be.visible');
      cy.get('button').contains('PDF').should('be.visible');
    });

    it('should handle export CSV functionality', () => {
      // Mock files and logs data
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: [
          {
            fileId: 'file1',
            fileName: 'test.pdf',
            mimeType: 'application/pdf',
            uploadTime: new Date().toISOString(),
            tags: 'work'
          }
        ]
      }).as('getFiles');

      cy.intercept('POST', 'http://localhost:5000/api/files/getAccesslog', {
        statusCode: 200,
        body: [
          {
            file_id: 'file1',
            user_id: 'user1',
            action: 'Downloaded',
            timestamp: new Date().toISOString()
          }
        ]
      }).as('getAccessLogs');

      cy.intercept('GET', 'http://localhost:5000/api/users/getUserInfo/user1', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            username: 'testuser',
            email: 'test@example.com',
            avatar_url: null
          }
        }
      }).as('getUserInfo');

      cy.wait(['@getFiles', '@getAccessLogs', '@getUserInfo']);

      // Test CSV export
      cy.get('button').contains('Export logs').trigger('mouseover');
      cy.get('button').contains('CSV').click();
      
      // Note: Actual file download testing would require additional cypress plugins
      // This just verifies the click doesn't cause errors
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/dashboard/accessLogs');
    });

    it('should handle API errors gracefully', () => {
      // Mock API errors
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 500,
        body: { success: false, message: 'Server error' }
      }).as('getFilesError');

      cy.wait('@getFilesError');

      // Page should still load with error handling
      cy.get('h1').contains('Access Logs').should('be.visible');
      cy.get('p').contains('Loading logs...').should('be.visible');
    });

    it('should handle missing user information', () => {
      // Mock files data
      cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
        statusCode: 200,
        body: [
          {
            fileId: 'file1',
            fileName: 'document.pdf',
            mimeType: 'application/pdf',
            uploadTime: new Date().toISOString(),
            tags: 'work'
          }
        ]
      }).as('getFiles');

      // Mock access logs
      cy.intercept('POST', 'http://localhost:5000/api/files/getAccesslog', {
        statusCode: 200,
        body: [
          {
            file_id: 'file1',
            user_id: 'missing-user',
            action: 'Viewed',
            timestamp: new Date().toISOString()
          }
        ]
      }).as('getAccessLogs');

      // Mock missing user info
      cy.intercept('GET', 'http://localhost:5000/api/users/getUserInfo/missing-user', {
        statusCode: 404,
        body: { success: false, message: 'User not found' }
      }).as('getUserInfoMissing');

      cy.wait(['@getFiles', '@getAccessLogs', '@getUserInfoMissing']);

      // Should show "Unknown User" fallback
      cy.get('table tbody tr').should('have.length', 1);
      cy.get('table tbody tr').first().should('contain', 'Unknown User');
    });
  });
});
