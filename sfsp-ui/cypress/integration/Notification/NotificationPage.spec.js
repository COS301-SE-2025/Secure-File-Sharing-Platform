describe("NotificationDropdown - Integration", () => {
  beforeEach(() => {
    // Visit the page where NotificationDropdown is rendered
    cy.visit("http://localhost:3000/dashboard");

    // Set a mock token in localStorage to simulate a logged-in user
    cy.window().then((window) => {
      window.localStorage.setItem("token", "mock-token");
    });

    // Mock user profile API response
    cy.intercept("GET", "http://localhost:5000/api/users/profile", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: "123", // user ID for fetching notifications
        },
      },
    }).as("profileRequest");

    // Mock notifications API response
    cy.intercept("POST", "http://localhost:5000/api/notifications/get", {
      statusCode: 200,
      body: {
        success: true,
        notifications: [
          { id: 1, message: "New file shared", read: false, type: "file_share_request", status: "pending", timestamp: new Date() },
          { id: 2, message: "Request accepted", read: true, type: "file_share_response", status: "accepted", timestamp: new Date() },
        ],
      },
    }).as("getNotificationsRequest");

    // Mock API responses for other actions like marking as read, responding to share requests, and clearing notifications
    cy.intercept("POST", "http://localhost:5000/api/notifications/markAsRead", {
      statusCode: 200,
      body: { success: true },
    }).as("markAsReadRequest");

    cy.intercept("POST", "http://localhost:5000/api/notifications/respond", {
      statusCode: 200,
      body: { success: true, fileData: {} },
    }).as("respondToShareRequest");

    cy.intercept("POST", "http://localhost:5000/api/notifications/clear", {
      statusCode: 200,
      body: { success: true },
    }).as("clearNotificationRequest");
  });

  it("should open the dropdown and fetch notifications when clicked", () => {
    // Click the dropdown to open it
    cy.get("div")
      .contains("Notifications")
      .click(); // Open the dropdown

    // Wait for the profile and notifications API calls to complete
    cy.wait("@profileRequest");
    cy.wait("@getNotificationsRequest");

    // Assert that the notifications are displayed correctly
    cy.get(".notification-item").should("have.length", 2);
    cy.get(".notification-item").first().should("contain", "New file shared");
  });

  it("should show unread count badge when there are unread notifications", () => {
    cy.get("div")
      .contains("Notifications")
      .click(); // Open the dropdown
    cy.wait("@profileRequest");
    cy.wait("@getNotificationsRequest");

    // Assert the unread count badge is visible
    cy.get(".notification-badge").should("contain", 1);
  });

  it("should mark a notification as read", () => {
    cy.get("div")
      .contains("Notifications")
      .click(); // Open the dropdown
    cy.wait("@profileRequest");
    cy.wait("@getNotificationsRequest");

    // Simulate marking the first notification as read
    cy.get(".notification-item").first().find("button.mark-read").click();
    cy.wait("@markAsReadRequest");

    // Ensure the notification is marked as read in the UI
    cy.get(".notification-item").first().should("have.class", "read");
  });

  it("should respond to a file share request (accept)", () => {
    cy.get("div")
      .contains("Notifications")
      .click(); // Open the dropdown
    cy.wait("@profileRequest");
    cy.wait("@getNotificationsRequest");

    // Simulate accepting a file share request
    cy.get(".notification-item").first().find("button.accept").click();
    cy.wait("@respondToShareRequest");

    // Assert that the notification's status is updated to accepted
    cy.get(".notification-item").first().should("have.class", "accepted");
  });

  it("should respond to a file share request (decline)", () => {
    cy.get("div")
      .contains("Notifications")
      .click(); // Open the dropdown
    cy.wait("@profileRequest");
    cy.wait("@getNotificationsRequest");

    // Simulate declining a file share request
    cy.get(".notification-item").first().find("button.decline").click();
    cy.wait("@respondToShareRequest");

    // Assert that the notification's status is updated to declined
    cy.get(".notification-item").first().should("have.class", "declined");
  });

  it("should clear a notification", () => {
    cy.get("div")
      .contains("Notifications")
      .click(); // Open the dropdown
    cy.wait("@profileRequest");
    cy.wait("@getNotificationsRequest");

    // Simulate clearing the first notification
    cy.get(".notification-item").first().find("button.clear").click();
    cy.wait("@clearNotificationRequest");

    // Assert that the notification is removed
    cy.get(".notification-item").should("have.length", 1);
  });

  it("should show the correct unread count", () => {
    cy.get("div")
      .contains("Notifications")
      .click(); // Open the dropdown
    cy.wait("@profileRequest");
    cy.wait("@getNotificationsRequest");

    // Check that the unread count is correct (should be 1 in this case)
    cy.get(".notification-badge").should("contain", 1);
  });

  it("should handle errors when fetching notifications", () => {
    // Mock error response for fetching notifications
    cy.intercept("POST", "http://localhost:5000/api/notifications/get", {
      statusCode: 500,
      body: { success: false, message: "Failed to fetch notifications" },
    }).as("getNotificationsError");

    cy.get("div")
      .contains("Notifications")
      .click(); // Open the dropdown
    cy.wait("@profileRequest");
    cy.wait("@getNotificationsError");

    // Assert that an error message is shown
    cy.get(".error-message").should("contain", "Failed to fetch notifications");
  });
});
