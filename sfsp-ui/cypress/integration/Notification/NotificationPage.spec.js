describe('NotificationDropdown - Integration Tests', () => {
  const token = 'test-token'; // mock token

  beforeEach(() => {
    // Intercept API calls
    cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
      statusCode: 200,
      body: { success: true, data: { id: '123' } }
    }).as('profileRequest');

    cy.intercept('POST', 'http://localhost:5000/api/notifications/get', {
      statusCode: 200,
      body: {
        success: true,
        notifications: [
          { id: '1', message: 'New file shared with you', type: 'file_share_request', status: 'pending', timestamp: Date.now() }
        ]
      }
    }).as('getNotificationsRequest');

    cy.intercept('POST', 'http://localhost:5000/api/notifications/markAsRead', {
      statusCode: 200,
      body: { success: true }
    }).as('markAsReadRequest');

    cy.intercept('POST', 'http://localhost:5000/api/notifications/respond', {
      statusCode: 200,
      body: { success: true, fileData: { fileId: 'file123' } }
    }).as('respondToShareRequest');

    cy.intercept('POST', 'http://localhost:5000/api/notifications/clear', {
      statusCode: 200,
      body: { success: true }
    }).as('clearNotificationRequest');

    // Set the token in localStorage
    window.localStorage.setItem('token', token);

    cy.visit('http://localhost:3000/dashboard');
  });

  it('should open the dropdown and fetch notifications when clicked', () => {
    cy.get('button.p-2.rounded').click(); // Adjust the selector to target the button by class
  cy.wait('@profileRequest'); // Wait for the profile API response
  //cy.wait('@getNotificationsRequest'); // Wait for the notifications API response

  // Check if notifications are rendered
  //cy.get('.text-sm.font-medium.text-blue-600').should('have.text', 'New file shared with you');
  });

  it('should show "No notifications" if there are no notifications', () => {
    // Intercept with an empty notifications response
    cy.intercept('POST', 'http://localhost:5000/api/notifications/get', {
      statusCode: 200,
      body: {
        success: true,
        notifications: []
      }
    }).as('getNotificationsRequestEmpty');

    cy.get('button.p-2.rounded').click(); // Adjust the selector to target the button by class
  cy.wait('@profileRequest'); // Wait for the profile API response
  //cy.wait('@getNotificationsRequest'); // Wait for the notifications API response

  // Check if notifications are rendered
  //cy.get('.text-sm.font-medium.text-blue-600').should('have.text', 'New file shared with you');

    // Check if "No notifications" text is displayed
    cy.get('.text-center.text-sm.text-gray-500').should('have.text', 'No notifications');
  });

  it('should mark notifications as read when clicked', () => {
    cy.get('button.p-2.rounded').click(); // Adjust the selector to target the button by class
  cy.wait('@profileRequest'); // Wait for the profile API response
  cy.wait('@getNotificationsRequest'); // Wait for the notifications API response

  // Check if notifications are rendered
  //cy.get('.text-sm.font-medium.text-blue-600').should('have.text', 'New file shared with you');

  // Check if notifications are rendered
  //cy.get('.text-sm.font-medium.text-blue-600').should('have.text', 'New file shared with you');

    // Click on the notification to mark it as read
    cy.get('.text-sm.font-medium.text-blue-600').click();
    cy.wait('@markAsReadRequest');

    // Check if the notification has the "read" status
    //cy.get('.text-sm.font-medium.text-blue-600').should('have.class', 'text-gray-600');
  });

  it('should clear the notification when clicked', () => {
      cy.get('button.p-2.rounded').click(); // Adjust the selector to target the button by class
  cy.wait('@profileRequest'); // Wait for the profile API response
  cy.wait('@getNotificationsRequest'); // Wait for the notifications API response

  // Click on the clear button (the button containing the "X" icon)
  cy.get('button.h-6.w-6.p-0').click();
  cy.wait('@clearNotificationRequest');

  // Ensure the notification is cleared
  cy.get('.text-sm.font-medium.text-blue-600').should('not.exist');
});

  it('should accept a file share request and trigger file transfer', () => {
    cy.get('button.p-2.rounded').click(); // Adjust the selector to target the button by class
  cy.wait('@profileRequest'); // Wait for the profile API response
  cy.wait('@getNotificationsRequest'); // Wait for the notifications API response

  // Check if notifications are rendered
  //cy.get('.text-sm.font-medium.text-blue-600').should('have.text', 'New file shared with you');

    // Click on accept button of the notification
    cy.get('button').contains('Accept').click();
    cy.wait('@respondToShareRequest');

    // Check if the file transfer function is called
    cy.get('@respondToShareRequest').its('response.body.fileData').should('have.property', 'fileId', 'file123');
  });

  it('should display the correct time format for notifications', () => {
    cy.get('button.p-2.rounded').click(); // Adjust the selector to target the button by class
  cy.wait('@profileRequest'); // Wait for the profile API response
  cy.wait('@getNotificationsRequest'); // Wait for the notifications API response

  // Check if notifications are rendered
  //cy.get('.text-sm.font-medium.text-blue-600').should('have.text', 'New file shared with you');

    // Get the timestamp of the notification
    cy.get('.text-xs.text-gray-400').should('contain', 'Just now'); // Or other time format
  });
});
