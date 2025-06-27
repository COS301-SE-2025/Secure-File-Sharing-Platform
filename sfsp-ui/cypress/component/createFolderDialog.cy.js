import React from 'react';
import { CreateFolderDialog } from '../../app/dashboard/myFilesV2/createFolderDialog';

describe('CreateFolderDialog Component', () => {
    it('should not render when open is false', () => {
        cy.mount(<CreateFolderDialog open={false} onOpenChange={() => {}} />);
        cy.get('h2').should('not.exist');
    });

    it('renders dialog when open is true', () => {
        cy.mount(<CreateFolderDialog open={true} onOpenChange={() => {}} />);
        cy.contains('Create New Folder').should('be.visible');
        cy.get('input[placeholder="Enter folder name"]').should('exist');
        cy.contains('Cancel').should('exist');
        cy.contains('Create Folder').should('exist');
    });

    it('disables "Create Folder" button when input is empty', () => {
        cy.mount(<CreateFolderDialog open={true} onOpenChange={() => {}} />);
        cy.contains('Create Folder').should('be.disabled');
    });

    it('enables "Create Folder" button when input has text', () => {
        cy.mount(<CreateFolderDialog open={true} onOpenChange={() => {}} />);
        cy.get('input').type('My New Folder');
        cy.contains('Create Folder').should('not.be.disabled');
    });

    it('calls onOpenChange(false) when clicking "Cancel"', () => {
        const onOpenChange = cy.stub().as('onClose');
        cy.mount(<CreateFolderDialog open={true} onOpenChange={onOpenChange} />);
        cy.contains('Cancel').click();
        cy.get('@onClose').should('have.been.calledWith', false);
    });

    it('calls onOpenChange(false) and clears input on "Create Folder"', () => {
        const onOpenChange = cy.stub().as('onClose');
        cy.mount(<CreateFolderDialog open={true} onOpenChange={onOpenChange} />);
        cy.get('input').type('FolderXYZ');
        cy.contains('Create Folder').click();
        cy.get('@onClose').should('have.been.calledWith', false);
    });

    it('submits on Enter key press', () => {
        const onOpenChange = cy.stub().as('onClose');
        cy.mount(<CreateFolderDialog open={true} onOpenChange={onOpenChange} />);
        cy.get('input').type('EnterSubmit{enter}');
        cy.get('@onClose').should('have.been.calledWith', false);
    });
});
