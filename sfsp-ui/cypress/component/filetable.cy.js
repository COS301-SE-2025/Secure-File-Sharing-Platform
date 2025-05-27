import React from 'react';
import FileTable from '../../app/dashboard/components/FileTable';

describe('FileTable', () => {
  it('renders table headers correctly', () => {
    cy.mount(<FileTable files={[]} />);
    cy.get('table thead tr').within(() => {
      ['Name', 'Size', 'Shared by', 'Shared', 'Actions'].forEach((header) => {
        cy.contains('th', header).should('exist');
      });
      cy.contains('th', 'Actions').should('have.class', 'text-right');
    });
  });

  it('renders empty table when no files are provided', () => {
    cy.mount(<FileTable files={[]} />);
    cy.get('table tbody tr').should('not.exist');
  });
});