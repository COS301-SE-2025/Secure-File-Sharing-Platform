import React from "react";
import NotificationDropdown from "../../app/dashboard/components/NotificationDropdown";

describe("NotificationDropdown Integration Test", () => {
    const notificationsMock = [
        {
            id: "notif1",
            message: "Alice shared a file with you",
            read: false,
            timestamp: new Date().toISOString(),
            type: "file_share_request",
            status: "pending",
        },
        {
            id: "notif2",
            message: "Bob accepted your share request",
            read: true,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            type: "file_share_response",
            status: "accepted",
        },
    ];

    beforeEach(() => {
        window.localStorage.setItem("token", "fake-jwt-token");

        cy.intercept("GET", "http://localhost:5000/api/users/profile", {
            statusCode: 200,
            body: {
                data: { id: "user123", email: "user@example.com" },
            },
        }).as("getProfile");

        cy.intercept("POST", "http://localhost:5000/api/notifications/get", {
            statusCode: 200,
            body: {
                success: true,
                notifications: notificationsMock,
            },
        }).as("getNotifications");

        cy.intercept("POST", "http://localhost:5000/api/notifications/markAsRead", {
            statusCode: 200,
            body: { success: true },
        }).as("markAsRead");

        cy.intercept("POST", "http://localhost:5000/api/notifications/respond", (req) => {
            req.reply({
                statusCode: 200,
                body: {
                    success: true,
                    fileData: req.body.status === "accepted" ? { id: "file123", name: "file.pdf" } : null,
                },
            });
        }).as("respond");

        cy.intercept("POST", "http://localhost:5000/api/notifications/clear", {
            statusCode: 200,
            body: { success: true },
        }).as("clearNotification");

        cy.mount(<NotificationDropdown />);
    });

    it("opens dropdown and fetches notifications", () => {
        cy.get("button").first().should("exist");

        cy.get("button").first().click();

        cy.wait("@getProfile");
        cy.wait("@getNotifications");

        cy.contains("Alice").should("exist");
        cy.contains("Bob").should("exist");

        cy.get("span").contains("1").should("exist");
    });

    it("marks a notification as read when clicked", () => {
        cy.get("button").first().click();
        cy.wait("@getProfile");
        cy.wait("@getNotifications");

        cy.contains("Alice").click();

        cy.wait("@markAsRead");

        cy.get("span")
            .contains("1")
            .should("not.exist");
    });

    it("accepts a file share request", () => {
        cy.get("button").first().click();
        cy.wait("@getProfile");
        cy.wait("@getNotifications");

        cy.contains("Alice")
            .parent()
            .within(() => {
                cy.get("button")
                    .contains("Accept")
                    .click();
            });

        cy.wait("@respond").its("request.body").should("include", {
            status: "accepted",
        });

        cy.contains("Accepted").should("exist");
    });

    
});
