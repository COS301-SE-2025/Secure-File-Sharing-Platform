import React from 'react';
import { ActivityLogsDialog } from '../../app/dashboard/myFilesV2/activityLogsDialog';
import '../../app/globals.css';

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

    it('shows loading state and then activity logs', () => {
        cy.mount(
        <ActivityLogsDialog open={true} onOpenChange={() => {}} file={fileMock} />
        );

        cy.contains('Loading activity logs...').should('be.visible');
        cy.wait('@getLogs');

        cy.contains('Activity for "testFile.pdf"').should('be.visible');
        cy.contains('user1 downloaded the file').should('be.visible');
        cy.contains('user2 shared the file').should('be.visible');
    });

    it('shows empty state if no activity logs are returned', () => {
        cy.intercept('POST', 'http://localhost:5000/api/files/getAccesslog', []).as('getEmptyLogs');

        cy.mount(
        <ActivityLogsDialog open={true} onOpenChange={() => {}} file={fileMock} />
        );

        cy.wait('@getEmptyLogs');
        cy.contains('No activity found for this file.').should('be.visible');
    });

    it('calls onOpenChange(false) when close button is clicked', () => {
        const onOpenChange = cy.stub().as('closeHandler');

        cy.mount(
        <ActivityLogsDialog open={true} onOpenChange={onOpenChange} file={fileMock} />
        );

        cy.get('button[aria-label="Close"]').click();
        cy.get('@closeHandler').should('have.been.calledWith', false);
    });
});
