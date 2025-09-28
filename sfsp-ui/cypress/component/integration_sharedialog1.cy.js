import React from "react";
import { ShareDialog } from "../../app/dashboard/myFilesV2/shareDialog";

describe("ShareDialog Integration Test", () => {
  const falseFile = {
    id: "fileID",
    name: "testFile.pdf",
  };

  beforeEach(() => {
    cy.mount(
      <ShareDialog open={true} onOpenChange={cy.stub()} file={falseFile} />
    );
  });

  it("renders dialog and adds recipients", () => {
    cy.contains(`Share "${falseFile.name}"`).should("be.visible");

    cy.get("input[placeholder='Enter email addresses']")
      .type("testuser@example.com{enter}");

    cy.contains("testuser@example.com").should("be.visible");
    cy.get("select").should("have.value", "view");
  });

  it("allows changing permission and removing recipient", () => {
    cy.get("input[placeholder='Enter email addresses']")
      .type("edituser@example.com{enter}");

    cy.contains("edituser@example.com").should("exist");

    cy.get("select").select("view").should("have.value", "view");

    cy.contains("edituser@example.com")
      .parents("div.flex.justify-between")
      .find("button")
      .last()
      .click();

    cy.contains("edituser@example.com").should("not.exist");
  });

  /* it("sends invite and makes API calls", () => {

    window.localStorage.setItem("token", "fake-jwt-token");

    cy.intercept("GET", "http://localhost:5000/api/users/profile", {
      statusCode: 200,
      body: {
        data: { id: "sender123", email: "sender@example.com" },
      },
    }).as("getProfile");

    cy.intercept("GET", "http://localhost:5000/api/users/getUserId/*", {
      statusCode: 200,
      body: {
        data: { id: "recipient456" },
      },
    }).as("getUserId");

    cy.intercept("POST", "http://localhost:5000/api/files/addAccesslog", {
      statusCode: 200,
    }).as("addAccessLog");

    cy.intercept("POST", "http://localhost:5000/api/notifications/add", {
      statusCode: 200,
    }).as("addNotification");

    cy.get("input[placeholder='Enter email addresses']")
      .type("notifyuser@example.com{enter}");

    cy.contains("notifyuser@example.com").should("exist");

    cy.get("button").contains("Send").click();

    cy.wait("@getProfile");
    cy.wait("@getUserId");
    
  }); */
});
