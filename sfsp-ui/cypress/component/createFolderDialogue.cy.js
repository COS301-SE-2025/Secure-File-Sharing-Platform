// cypress/component/createFolderDialogue
import React from 'react';
import { CreateFolderDialog } from '../../app/dashboard/myFilesV2/createFolderDialog';

describe('<CreateFolderDialog />', () => {
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

  it('calls onOpenChange(false) and clears input on folder creation via button click', () => {
    const onOpenChange = cy.stub().as('onOpenChange');
    cy.mount(<CreateFolderDialog open={true} onOpenChange={onOpenChange} />);

    cy.get('input#folder-name').type('New Folder');
    cy.contains('Create Folder').click();

    cy.get('@onOpenChange').should('have.been.calledWith', false);

    cy.get('input#folder-name').should('have.value', '');
  });

  it('calls onOpenChange(false) when Cancel button is clicked', () => {
    const onOpenChange = cy.stub().as('onOpenChange');
    cy.mount(<CreateFolderDialog open={true} onOpenChange={onOpenChange} />);

    cy.contains('Cancel').click();
    cy.get('@onOpenChange').should('have.been.calledWith', false);
  });

  it('creates folder when Enter key pressed in input', () => {
    const onOpenChange = cy.stub().as('onOpenChange');
    cy.mount(<CreateFolderDialog open={true} onOpenChange={onOpenChange} />);

    cy.get('input#folder-name').type('Folder via Enter{enter}');
    cy.get('@onOpenChange').should('have.been.calledWith', false);
    cy.get('input#folder-name').should('have.value', '');
  });

  it('does not create folder if input is empty when Enter pressed', () => {
    const onOpenChange = cy.stub().as('onOpenChange');
    cy.mount(<CreateFolderDialog open={true} onOpenChange={onOpenChange} />);

    cy.get('input#folder-name').type('{enter}');
    cy.get('@onOpenChange').should('not.have.been.called');
  });
});
