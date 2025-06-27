import React from "react";
import { ActivityLogsDialog } from "../../app/dashboard/myFilesV2/activityLogsDialog";

describe("ActivityLogsDialog Integration Test", () => {
  const mockFile = {
    id: "fileID",
    name: "proj.docx",
  };

  const mockLogs = [
    {
      id: "log1",
      file_id: "fileID",
      user_id: "user1",
      action: "shared",
      message: "User alice@example.com has shared the file with bob@example.com",
      timestamp: new Date().toISOString(),
    },
    {
      id: "log2",
      file_id: "fileID",
      user_id: "user2",
      action: "downloaded",
      message: "User bob@example.com downloaded the file",
      timestamp: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    cy.intercept("POST", "http://localhost:5000/api/files/getAccesslog", (req) => {
      req.reply(mockLogs);
    }).as("getAccesslog");

    cy.mount(
      <ActivityLogsDialog open={true} onOpenChange={cy.stub()} file={mockFile} />
    );
  });

  it("renders activity logs for the file", () => {
    cy.contains(`Activity for "${mockFile.name}"`).should("exist");

    cy.wait("@getAccesslog");

    cy.contains("alice@example.com").should("exist");
    cy.contains("shared").should("exist");

    cy.contains("bob@example.com").should("exist");
    cy.contains("downloaded").should("exist");

    cy.get("svg").should("have.length.at.least", 2); // icons
  });

  it("shows 'No activity' message when logs are empty", () => {
    cy.intercept("POST", "http://localhost:5000/api/files/getAccesslog", {
      statusCode: 200,
      body: [],
    }).as("getEmptyLogs");

    cy.mount(
      <ActivityLogsDialog open={true} onOpenChange={cy.stub()} file={mockFile} />
    );

    cy.wait("@getEmptyLogs");
    cy.contains("No activity found for this file.").should("be.visible");
  });

  it("shows error message on fetch failure", () => {
    cy.intercept("POST", "http://localhost:5000/api/files/getAccesslog", {
      statusCode: 500,
    }).as("getErrorLogs");

    cy.mount(
      <ActivityLogsDialog open={true} onOpenChange={cy.stub()} file={mockFile} />
    );

    cy.wait("@getErrorLogs");
    cy.contains("No activity found for this file.").should("exist"); 
  });

  it("closes the dialog when X is clicked", () => {
    const onClose = cy.stub().as("onClose");

    cy.mount(
      <ActivityLogsDialog open={true} onOpenChange={onClose} file={mockFile} />
    );

    cy.get("button[aria-label='Close']").click();
    cy.get("@onClose").should("have.been.calledWith", false);
  });
});
