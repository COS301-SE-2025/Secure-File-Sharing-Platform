import React from "react";
import { ShareDialog } from "@/app/dashboard/myFilesV2/shareDialog";

describe("<ShareDialog />", () => {
  const file = { id: "file123", name: "testfile.txt" };
  let onOpenChange;

  beforeEach(() => {
    onOpenChange = cy.stub().as("onOpenChange");

    cy.mount(<ShareDialog open={true} onOpenChange={onOpenChange} file={file} />);
  });

  it("shows validation error when adding empty email", () => {
    cy.get("button.bg-gray-400").click();
    cy.contains("Please enter an email address.").should("be.visible");
  });

  it("shows validation error when adding invalid email", () => {
    cy.get("input[placeholder='Enter email addresses']").type("invalidemail");
    cy.get("button.bg-gray-400").click();
    cy.contains("Please enter a valid email address.").should("be.visible");
  });

  it("adds a valid email to the list", () => {
    cy.get("input[placeholder='Enter email addresses']").type("test@example.com");
    cy.get("button.bg-gray-400").click();
    cy.contains("test@example.com").should("exist");
  });

  it("prevents adding duplicate emails", () => {
    cy.get("input[placeholder='Enter email addresses']").type("dup@example.com");
    cy.get("button.bg-gray-400").click();

    cy.get("input[placeholder='Enter email addresses']").type("dup@example.com");
    cy.get("button.bg-gray-400").click();

    cy.contains("This email is already added.").should("be.visible");
  });

  it("removes a recipient", () => {
    cy.mount(<ShareDialog open={true} onOpenChange={onOpenChange} file={file} />);
    cy.get('input[placeholder="Enter email addresses"]').type("remove@example.com");
    cy.get("button.bg-gray-400").click();

    cy.contains("remove@example.com").should("exist");
    cy.get("button.p-1").click(); // remove button

    cy.contains("remove@example.com").should("not.exist");
  });

  it("closes dialog on cancel button click", () => {
    cy.mount(<ShareDialog open={true} onOpenChange={onOpenChange} file={file} />);
    cy.contains("Cancel").click();
    cy.get("@onOpenChange").should("have.been.calledWith", false);
  });
  
  it("updates permission for a recipient", () => {
    cy.mount(<ShareDialog open={true} onOpenChange={onOpenChange} file={file} />);
    cy.get('input[placeholder="Enter email addresses"]').type("permtest@example.com");
    cy.get("button.bg-gray-400").click();

    cy.get("select").select("download");
    cy.get("select").should("have.value", "download");

    cy.get("select").select("view");
    cy.get("select").should("have.value", "view");
  });

});
