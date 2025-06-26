import React from 'react';
import { FileDetailsDialog } from '../../app/dashboard/myFilesV2/fileDetailsDialog';

describe('FileDetailsDialog Component', () => {
    const mockFile = {
        name: 'document.pdf',
        type: 'pdf',
        size: '2.3 MB',
        modified: '2025-06-25',
        category: 'Work',
        starred: true,
        shared: true,
    };

    Cypress._.defer(() => {
        cy.mount(
        <FileDetailsDialog open={true} onOpenChange={() => {}} file={mockFile} />
        );
    });

    it('does not render when open is false', () => {
        cy.mount(
        <FileDetailsDialog open={false} onOpenChange={() => {}} file={mockFile} />
        );
        cy.get('h2').should('not.exist');
    });

    it('renders correctly when open is true', () => {
        cy.mount(
        <FileDetailsDialog open={true} onOpenChange={() => {}} file={mockFile} />
        );
        cy.contains('File Details').should('be.visible');
        cy.contains(mockFile.name).should('be.visible');
        cy.contains('Pdf file').should('be.visible');
        cy.contains('Starred').should('be.visible');
        cy.contains('Shared').should('be.visible');
        cy.contains('2.3 MB').should('be.visible');
        cy.contains('2025-06-25').should('be.visible');
        cy.contains('You').should('be.visible');
        cy.contains('My Files / Work').should('be.visible');
    });

    it('renders fallback category when missing', () => {
        const file = { ...mockFile, category: undefined };
        cy.mount(<FileDetailsDialog open={true} onOpenChange={() => {}} file={file} />);
        cy.contains('My Files / Unknown').should('be.visible');
    });

    it('conditionally shows "Starred" and "Shared" tags', () => {
        const file = { ...mockFile, starred: false, shared: false };
        cy.mount(<FileDetailsDialog open={true} onOpenChange={() => {}} file={file} />);
        cy.contains('Starred').should('not.exist');
        cy.contains('Shared').should('not.exist');
    });

    it('calls onOpenChange(false) when close button is clicked', () => {
        const onOpenChange = cy.stub().as('onClose');
        cy.mount(
        <FileDetailsDialog open={true} onOpenChange={onOpenChange} file={mockFile} />
        );
        cy.get('button[aria-label="Close dialog"]').click();
        cy.get('@onClose').should('have.been.calledWith', false);
    });
});
