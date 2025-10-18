import React from "react";
import { ShareDialog } from "@/app/dashboard/myFilesV2/shareDialog";

describe("<ShareDialog />", () => {
  const file = { id: "file123", name: "testfile.txt" };
  let onOpenChange;

  beforeEach(() => {
    onOpenChange = cy.stub().as("onOpenChange");

    cy.mount(<ShareDialog open={true} onOpenChange={onOpenChange} file={file} />);
  });

  it("closes dialog on cancel button click", () => {
    cy.mount(<ShareDialog open={true} onOpenChange={onOpenChange} file={file} />);
    cy.contains("Cancel").click();
    cy.get("@onOpenChange").should("have.been.calledWith", false);
  });

});
