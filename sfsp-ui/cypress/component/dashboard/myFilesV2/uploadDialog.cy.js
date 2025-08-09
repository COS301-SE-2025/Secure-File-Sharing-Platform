// cypress/component/uploadDialog

import React from 'react';
import { UploadDialog } from '../../app/dashboard/myFilesV2/uploadDialog';

describe('<UploadDialog />', () => {
    const mockFile = new File(['hello'], 'test.txt', { type: 'text/plain' });

    beforeEach(() => {
        cy.stub(global, 'fetch').resolves({ ok: true, json: () => ({}) });
    });


    it('should not render when open is false', () => {
        cy.mount(
            <UploadDialog open={false} onOpenChange={cy.stub()} onUploadSuccess={cy.stub()} />
        );
        cy.contains('Upload Files').should('not.exist');
    });

    it('renders when open is true', () => {
        cy.mount(
            <UploadDialog open={true} onOpenChange={cy.stub()} onUploadSuccess={cy.stub()} />
        );
        cy.contains('Upload Files').should('exist');
    });

    it('adds files via file input', () => {
        cy.mount(
            <UploadDialog open={true} onOpenChange={cy.stub()} onUploadSuccess={cy.stub()} />
        );

        cy.get('input[type="file"]').selectFile('cypress/fixtures/test.txt', { force: true });

        cy.contains('test.txt').should('exist');
        cy.contains('Upload (1)').should('exist');
    });

    it('removes a file from the list', () => {
        cy.mount(
            <UploadDialog open={true} onOpenChange={cy.stub()} onUploadSuccess={cy.stub()} />
        );

        cy.get('input[type="file"]').selectFile('cypress/fixtures/test.txt', { force: true });

        cy.contains('test.txt').should('exist');
        cy.contains('Upload (1)').should('exist');

        cy.get('button').find('svg').first().parent().click();

        cy.contains('test.txt').should('not.exist');
    });

    it('clicking cancel calls onOpenChange with false', () => {
        const onOpenChange = cy.stub().as('onOpenChange');
        cy.mount(
            <UploadDialog open={true} onOpenChange={onOpenChange} onUploadSuccess={cy.stub()} />
        );

        cy.contains('Cancel').click();
        cy.get('@onOpenChange').should('have.been.calledWith', false);
    });
});