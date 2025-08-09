import React from 'react';
import { CreateFolderDialog } from '../../../../app/dashboard/myFilesV2/createFolderDialog';

describe('CreateFolderDialog Component', () => {
  it('should not render when open is false', () => {
    cy.mount(<CreateFolderDialog open={false} onOpenChange={() => { }} />);
    cy.get('h2').should('not.exist');
  });

  it('renders dialog when open is true', () => {
    cy.mount(<CreateFolderDialog open={true} onOpenChange={() => { }} />);
    cy.contains('Create New Folder').should('be.visible');
    cy.get('input[placeholder="Enter folder name"]').should('exist');
    cy.contains('Cancel').should('exist');
    cy.contains('Create Folder').should('exist');
  });

  it('disables "Create Folder" button when input is empty', () => {
    cy.mount(<CreateFolderDialog open={true} onOpenChange={() => { }} />);
    cy.contains('Create Folder').should('be.disabled');
  });

  it('enables "Create Folder" button when input has text', () => {
    cy.mount(<CreateFolderDialog open={true} onOpenChange={() => { }} />);
    cy.get('input').type('My New Folder');
    cy.contains('Create Folder').should('not.be.disabled');
  });

  it('calls onOpenChange(false) when clicking "Cancel"', () => {
    const onOpenChange = cy.stub().as('onClose');
    cy.mount(<CreateFolderDialog open={true} onOpenChange={onOpenChange} />);
    cy.contains('Cancel').click();
    cy.get('@onClose').should('have.been.calledWith', false);
  });

  it('does not render when open is false', () => {
    cy.mount(<CreateFolderDialog open={false} onOpenChange={cy.stub()} />);
    cy.get('h2').should('not.exist');
  });

  it('renders dialog when open is true', () => {
    cy.mount(<CreateFolderDialog open={true} onOpenChange={cy.stub()} />);
    cy.contains('Create New Folder').should('exist');
    cy.get('input#folder-name').should('exist');
  });

  it('enables Create Folder button only when input has text', () => {
    cy.mount(<CreateFolderDialog open={true} onOpenChange={cy.stub()} />);
    cy.contains('Create Folder').should('be.disabled');

    cy.get('input#folder-name').type('My Folder');
    cy.contains('Create Folder').should('not.be.disabled');
  });

  it('calls onOpenChange(false) when Cancel button is clicked', () => {
    const onOpenChange = cy.stub().as('onOpenChange');
    cy.mount(<CreateFolderDialog open={true} onOpenChange={onOpenChange} />);

    cy.contains('Cancel').click();
    cy.get('@onOpenChange').should('have.been.calledWith', false);
  });

  it('does not create folder if input is empty when Enter pressed', () => {
    const onOpenChange = cy.stub().as('onOpenChange');
    cy.mount(<CreateFolderDialog open={true} onOpenChange={onOpenChange} />);

    cy.get('input#folder-name').type('{enter}');
    cy.get('@onOpenChange').should('not.have.been.called');
  });

});
