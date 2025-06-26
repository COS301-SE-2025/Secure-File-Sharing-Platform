import React from 'react';
import { mount } from 'cypress/react';
import FileTable from '../../app/dashboard/components/FileTable';

describe('FileTable', () => {
  it('renders table headers correctly', () => {
    mount(<FileTable files={[]} />);
    cy.get('table thead tr').within(() => {
      ['Name', 'Size', 'Shared by', 'Shared', 'Actions'].forEach((header) => {
        cy.contains('th', header).should('exist');
      });
    });
  });

  it('renders empty table when no files are provided', () => {
    mount(<FileTable files={[]} />);
    cy.get('table tbody tr').should('not.exist');
  });
});