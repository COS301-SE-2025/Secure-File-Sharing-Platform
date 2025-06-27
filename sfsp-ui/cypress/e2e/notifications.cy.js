describe('Notifications E2E Tests', () => {
    const testUser = {
        email: 'test@example.com',
        password: 'Password123!'
    };

    beforeEach(() => {
        // Mock user authentication
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

        // Mock notifications API call
        cy.intercept('GET', 'http://localhost:5000/api/notifications', {
            statusCode: 200,
            body: {
                notifications: [
                    {
                        id: 'notif-1',
                        userId: 'user-123',
                        type: 'file_shared',
                        message: 'User2 shared a file with you: Project Report.docx',
                        fileId: 'file-789',
                        read: false,
                        createdAt: '2025-06-25T08:00:00Z'
                    },
                    {
                        id: 'notif-2',
                        userId: 'user-123',
                        type: 'file_downloaded',
                        message: 'Your file was downloaded: Budget2025.xlsx',
                        fileId: 'file-456',
                        read: true,
                        createdAt: '2025-06-24T14:30:00Z'
                    }
                ]
            }
        }).as('getNotifications');

        // Mock mark notification as read API call
        cy.intercept('PUT', 'http://localhost:5000/api/notifications/*/read', {
            statusCode: 200,
            body: { success: true }
        }).as('markNotificationRead');

        // Mock mark all notifications as read API call
        cy.intercept('PUT', 'http://localhost:5000/api/notifications/read-all', {
            statusCode: 200,
            body: { success: true }
        }).as('markAllNotificationsRead');

        // Visit the dashboard page with baseUrl configured in cypress.config.js
        cy.visit('/dashboard');
    });

    it('should display notifications in the notification center', () => {
        // Wait for notifications to load
        cy.wait('@getNotifications');

        // Click on the notification bell icon
        cy.get('[data-testid="notification-bell"]').click();

        // Verify notifications are displayed
        cy.contains('User2 shared a file with you').should('be.visible');
        cy.contains('Your file was downloaded').should('be.visible');

        // Verify unread notification has the appropriate visual indicator
        cy.contains('User2 shared a file with you')
            .parent()
            .should('have.class', 'bg-blue-50');
    });

    it('should mark a notification as read when clicked', () => {
        // Wait for notifications to load
        cy.wait('@getNotifications');

        // Click on the notification bell icon
        cy.get('[data-testid="notification-bell"]').click();

        // Click on an unread notification
        cy.contains('User2 shared a file with you').click();

        // Verify API call was made to mark it as read
        cy.wait('@markNotificationRead');

        // Verify we navigate to the relevant file/location based on notification type
        cy.url().should('include', '/dashboard/shared');
    });

    it('should mark all notifications as read when using "Mark all as read" button', () => {
        // Wait for notifications to load
        cy.wait('@getNotifications');

        // Click on the notification bell icon
        cy.get('[data-testid="notification-bell"]').click();

        // Click on "Mark all as read" button
        cy.contains('Mark all as read').click();

        // Verify API call was made to mark all as read
        cy.wait('@markAllNotificationsRead');

        // Verify notification indicators are updated
        cy.get('[data-testid="notification-bell"]')
            .find('.notification-badge')
            .should('not.exist');
    });

    it('should receive and display real-time notifications', () => {
        // This test simulates receiving a new real-time notification

        // Wait for initial notifications to load
        cy.wait('@getNotifications');

        // Get the initial notification count
        cy.get('[data-testid="notification-bell"]')
            .find('.notification-badge')
            .invoke('text')
            .then((initialCount) => {
                // Simulate a new notification by updating the intercept response
                cy.intercept('GET', 'http://localhost:5000/api/notifications', {
                    statusCode: 200,
                    body: {
                        notifications: [
                            {
                                id: 'notif-3',
                                userId: 'user-123',
                                type: 'file_comment',
                                message: 'User3 commented on your file: "Great work!"',
                                fileId: 'file-123',
                                read: false,
                                createdAt: new Date().toISOString()
                            },
                            {
                                id: 'notif-1',
                                userId: 'user-123',
                                type: 'file_shared',
                                message: 'User2 shared a file with you: Project Report.docx',
                                fileId: 'file-789',
                                read: false,
                                createdAt: '2025-06-25T08:00:00Z'
                            },
                            {
                                id: 'notif-2',
                                userId: 'user-123',
                                type: 'file_downloaded',
                                message: 'Your file was downloaded: Budget2025.xlsx',
                                fileId: 'file-456',
                                read: true,
                                createdAt: '2025-06-24T14:30:00Z'
                            }
                        ]
                    }
                }).as('updatedNotifications');

                // Trigger a refresh of notifications (this might be automatic in your app,
                // or might require a specific action)
                cy.wait(5000); // Wait for auto-refresh or manually trigger it
                cy.get('[data-testid="notification-bell"]').click();

                // Verify the new notification is displayed
                cy.contains('User3 commented on your file').should('be.visible');

                // Verify the notification badge count increased
                cy.get('[data-testid="notification-bell"]')
                    .find('.notification-badge')
                    .invoke('text')
                    .should('not.eq', initialCount);
            });
    });
});
