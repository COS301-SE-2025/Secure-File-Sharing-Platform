import React from 'react';
import { ActivityLogsDialog } from '../../../../app/dashboard/myFilesV2/activityLogsDialog';
import '../../../../app/globals.css';

describe('ActivityLogsDialog Component', () => {
    const fileMock = {
        id: 'file123',
        name: 'testFile.pdf',
    };

    const fakeLogs = [
        {
            id: 'log1',
            file_id: 'file123',
            user_id: 'user1',
            action: 'downloaded',
            message: 'user1 downloaded the file',
            timestamp: new Date().toISOString(),
        },
        {
            id: 'log2',
            file_id: 'file123',
            user_id: 'user2',
            action: 'shared',
            message: 'user2 shared the file',
            timestamp: new Date().toISOString(),
        },
    ];

    beforeEach(() => {
        cy.intercept('POST', 'http://localhost:5000/api/files/getAccesslog', fakeLogs).as('getLogs');
    });

    it('calls onOpenChange(false) when close button is clicked', () => {
        const onOpenChange = cy.stub().as('closeHandler');

        cy.mount(
            <ActivityLogsDialog open={true} onOpenChange={onOpenChange} file={fileMock} />
        );

        cy.get('button[aria-label="Close"]').click();
        cy.get('@closeHandler').should('have.been.calledWith', false);
    });

    const mockFile = { id: 'file-123', name: 'Test File' };

    beforeEach(() => {
        cy.stub(window, 'fetch'); // Stub fetch for each test
    });

    it('does not render when open is false', () => {
        cy.mount(<ActivityLogsDialog open={false} file={mockFile} onOpenChange={cy.stub()} />);
        cy.get('body').should('not.contain.text', 'Activity for');
    });

    it('does not render when file is missing', () => {
        cy.mount(<ActivityLogsDialog open={true} file={null} onOpenChange={cy.stub()} />);
        cy.get('body').should('not.contain.text', 'Activity for');
    });

    it('shows loading state', () => {
        window.fetch.returns(new Promise(() => { })); // Never resolve
        cy.mount(<ActivityLogsDialog open={true} file={mockFile} onOpenChange={cy.stub()} />);
        cy.contains('Loading activity logs...').should('be.visible');
    });

    it('shows no activity message when logs are empty', () => {
        window.fetch.resolves({
            ok: true,
            json: () => Promise.resolve([]),
        });

        cy.mount(<ActivityLogsDialog open={true} file={mockFile} onOpenChange={cy.stub()} />);
        cy.contains('No activity found for this file.').should('be.visible');
    });

    /* it('renders activity logs when data is returned', () => {
        const fakeLogs = [
            {
                id: 'log-1',
                file_id: 'file-123',
                action: 'downloaded',
                message: 'User John downloaded file',
                user_id: 'John',
                timestamp: Date.now(),
            },
            {
                id: 'log-2',
                file_id: 'file-123',
                action: 'shared',
                message: 'User Jane shared file',
                user_id: 'Jane',
                timestamp: Date.now(),
            }
        ];

        window.fetch.resolves({
            ok: true,
            json: () => Promise.resolve(fakeLogs),
        });

        cy.mount(<ActivityLogsDialog open={true} file={mockFile} onOpenChange={cy.stub()} />);

        cy.contains('John').should('be.visible');
        cy.contains('downloaded').should('be.visible');
        cy.contains('Jane').should('be.visible');
        cy.contains('shared').should('be.visible');
    }); */

    it('calls onOpenChange(false) when close button is clicked', () => {
        const onOpenChange = cy.stub();

        window.fetch.resolves({
            ok: true,
            json: () => Promise.resolve([]),
        });

        cy.mount(<ActivityLogsDialog open={true} file={mockFile} onOpenChange={onOpenChange} />);

        cy.get('button[aria-label="Close"]').click().then(() => {
            expect(onOpenChange).to.have.been.calledWith(false);
        });
    });
});
