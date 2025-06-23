import React from 'react';
import { FileDetailsDialog } from '../../app/dashboard/myFilesV2/fileDetailsDialog';

describe('<FileDetailsDialog />', () => {
    const mockFile = {
        name: 'example.pdf',
        type: 'pdf',
        size: '1.2 MB',
        modified: '2025-06-20',
        category: 'Documents',
        starred: true,
        shared: true,
    };

    it('renders correctly with file details', () => {
        cy.mount(
            <FileDetailsDialog open={true} onOpenChange={cy.stub()} file={mockFile} />
        );

        cy.contains('File Details').should('exist');
        cy.contains(mockFile.name).should('exist');
        cy.contains('Pdf file').should('exist');
        cy.contains('Starred').should('exist');
        cy.contains('Shared').should('exist');
        cy.contains('Size').next().should('have.text', mockFile.size);
        cy.contains('Last Modified').next().should('have.text', mockFile.modified);
        cy.contains('Owner').next().should('have.text', 'You');
        cy.contains('My Files / Documents').should('exist');
    });

    it('does not render content when open is false', () => {
        cy.mount(
            <FileDetailsDialog open={false} onOpenChange={cy.stub()} file={{}} />
        );

        cy.contains('File Details').should('not.exist');
    });

    it('calls onOpenChange(false) when close button is clicked', () => {
        const onOpenChange = cy.stub().as('onOpenChange');
        cy.mount(
            <FileDetailsDialog open={true} onOpenChange={onOpenChange} file={mockFile} />
        );

        cy.get('button[aria-label="Close dialog"]').click();
        cy.get('@onOpenChange').should('have.been.calledWith', false);
    });
});
