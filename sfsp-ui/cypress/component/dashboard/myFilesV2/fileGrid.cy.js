import React from 'react';
import { FileGrid } from '../../../../app/dashboard/myFilesV2/fileGrid';

const mockFiles = [
  {
    id: '1',
    name: 'Project Report.pdf',
    type: 'pdf',
    size: 2097152, // 2 MB in bytes
    modified: '2025-06-25',
    starred: true,
    shared: true,
  },
  {
    id: '2',
    name: 'Vacation.png',
    type: 'image',
    size: 3670016, // 3.5 MB in bytes
    modified: '2025-06-20',
    starred: false,
    shared: false,
  },
];

const setupFetchStubs = () => {
  cy.stub(window.localStorage, 'getItem').returns('fake-token');

  cy.intercept('POST', '**/addTags', { statusCode: 200 }).as('addTags');
  cy.intercept('GET', '**/users/profile', {
    statusCode: 200,
    body: { data: { id: 'user-1', email: 'test@user.com' } },
  }).as('getProfile');

  cy.intercept('POST', '**/addAccesslog', { statusCode: 200 }).as('addLog');
};

describe('<FileGrid />', () => {
  beforeEach(() => {
    setupFetchStubs();
  });

  it('closes context menu when clicking outside', () => {
    cy.mount(
      <div>
        <FileGrid
          files={mockFiles}
          onShare={cy.stub()}
          onViewDetails={cy.stub()}
          onViewActivity={cy.stub()}
          onDownload={cy.stub()}
          onDelete={cy.stub()}
        />
        <div data-cy="outside">Outside Area</div>
      </div>
  );

  cy.contains('Vacation.png').rightclick();
  cy.contains('Download').should('be.visible');

  cy.get('[data-cy="outside"]').click({ force: true });

  cy.contains('Download').should('not.exist');
});

  /* it('handles delete action and closes menu', () => {
    const onDelete = cy.stub().as('onDelete');

    cy.mount(
      <FileGrid
        files={mockFiles}
        onShare={cy.stub()}
        onViewDetails={cy.stub()}
        onViewActivity={cy.stub()}
        onDownload={cy.stub()}
        onDelete={onDelete}
      />
    );

    cy.contains('Vacation.png').rightclick();
    cy.contains('Delete').click();

    cy.wait('@addTags');
    cy.wait('@getProfile');
    cy.wait('@addLog');

    cy.get('@onDelete').should('have.been.calledOnce');
  }); */
});