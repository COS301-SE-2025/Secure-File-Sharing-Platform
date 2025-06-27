describe('File Access Logs E2E Tests', () => {
    const testUser = {
        email: 'test@example.com',
        password: 'Password123!'
    };

    beforeEach(() => {
        // Mock user authentication - this simulates login
        cy.window().then((win) => {
            win.localStorage.setItem('token', 'mock-jwt-token');
        });

        // Intercept API calls we expect during the tests
        cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    id: 'user-123',
                    email: testUser.email,
                },
            },
        }).as('getProfile');

        // Mock file listing API call
        cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
            statusCode: 200,
            body: [
                {
                    id: 'file-123',
                    name: 'Important Document.pdf',
                    type: 'pdf',
                    size: '2.5 MB',
                    modified: '2025-06-24',
                    starred: false,
                },
                {
                    id: 'file-456',
                    name: 'Project Presentation.pptx',
                    type: 'document',
                    size: '4.8 MB',
                    modified: '2025-06-25',
                    starred: true,
                }
            ]
        }).as('getFiles');

        // Mock access logs API call
        cy.intercept('GET', 'http://localhost:5000/api/files/getAccesslog*', {
            statusCode: 200,
            body: [
                {
                    id: 'log-1',
                    file_id: 'file-123',
                    user_id: 'user-123',
                    action: 'viewed',
                    timestamp: '2025-06-25T10:30:00Z'
                },
                {
                    id: 'log-2',
                    file_id: 'file-123',
                    user_id: 'user-123',
                    action: 'downloaded',
                    timestamp: '2025-06-25T10:35:00Z'
                }
            ]
        }).as('getAccessLogs');

        // Mock add access log API call
        cy.intercept('POST', 'http://localhost:5000/api/files/addAccesslog', {
            statusCode: 201,
            body: 'Access log added successfully'
        }).as('addAccessLog');

        // Visit the dashboard page with baseUrl already configured
        cy.visit('/dashboard/myFiles');
    });

    it('should record file view activity when viewing file details', () => {
        // Wait for files to load
        cy.wait('@getFiles');

        // Right-click on the first file to open context menu
        cy.contains('Important Document.pdf').rightclick();

        // Click on "View Details" from the context menu
        cy.contains('View Details').click();

        // Verify that the access log API was called with correct parameters
        cy.wait('@addAccessLog').its('request.body').should('deep.include', {
            file_id: 'file-123',
            user_id: 'user-123',
            action: 'viewed'
        });

        // Verify the file details dialog is shown
        cy.contains('File Details').should('be.visible');
        cy.contains('Important Document.pdf').should('be.visible');
    });

    it('should record download activity when downloading a file', () => {
        // Wait for files to load
        cy.wait('@getFiles');

        // Find the download button for the first file and click it
        cy.contains('tr', 'Important Document.pdf')
            .find('button[title="Download"]')
            .click();

        // Verify that the access log API was called with correct parameters
        cy.wait('@addAccessLog').its('request.body').should('deep.include', {
            file_id: 'file-123',
            user_id: 'user-123',
            action: 'downloaded'
        });
    });

    it('should display access logs in the activity logs dialog', () => {
        // Wait for files to load
        cy.wait('@getFiles');

        // Right-click on the first file to open context menu
        cy.contains('Important Document.pdf').rightclick();

        // Click on "Activity Logs" from the context menu
        cy.contains('Activity Logs').click();

        // Wait for access logs to be fetched
        cy.wait('@getAccessLogs');

        // Verify that the activity logs dialog shows the logs
        cy.contains('Activity for "Important Document.pdf"').should('be.visible');
        cy.contains('viewed').should('be.visible');
        cy.contains('downloaded').should('be.visible');
    });

    it('should navigate to and display the access logs page', () => {
        // Go directly to the access logs page
        cy.visit('/dashboard/accessLogs');

        // Wait for access logs to be fetched (this will be a different call, but reusing the same alias)
        cy.wait('@getAccessLogs');

        // Verify the page is properly loaded
        cy.contains('Access Logs').should('be.visible');

        // Verify filtering works
        cy.get('select').select('Downloaded');
        cy.contains('td', 'downloaded').should('be.visible');
    });
});
