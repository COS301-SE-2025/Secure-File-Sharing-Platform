import React from 'react';
import FileTable from '../../app/dashboard/components/FileTable';
import mountWithAppRouter from '../support/mountWithAppRouter';

describe('FileTable component', () => {
  const files = [
    {
      name: 'Roadmap.xlsx',
      size: '1.8 MB',
      sharedBy: 'Robert Fox',
      sharedTime: '5 days ago',
      type: 'document',
    },
    {
      name: 'Banner.png',
      size: '850 KB',
      sharedBy: 'Emily Wilson',
      sharedTime: '1 week ago',
      type: 'image',
    },
  ];

  beforeEach(() => {
    mountWithAppRouter(<FileTable files={files} />);
  });

  it('renders the table headers', () => {
    cy.get('thead th').should('have.length', 5);
    cy.get('thead th').eq(0).should('contain.text', 'Name');
    cy.get('thead th').eq(1).should('contain.text', 'Size');
    cy.get('thead th').eq(2).should('contain.text', 'Shared by');
    cy.get('thead th').eq(3).should('contain.text', 'Shared');
    cy.get('thead th').eq(4).should('contain.text', 'Actions');
  });

  it('renders the correct number of rows', () => {
    cy.get('tbody tr').should('have.length', files.length);
  });

  it('renders file data in rows', () => {
    cy.get('tbody tr').first().within(() => {
      cy.get('td').eq(0).within(() => {
        cy.get('span').should('contain.text', files[0].name);
        cy.get('div').should('have.class', 'bg-blue-100');
        cy.get('svg').should('have.class', 'text-blue-600');
      });
      cy.get('td').eq(1).should('contain.text', files[0].size);
      cy.get('td').eq(2).should('contain.text', files[0].sharedBy);
      cy.get('td').eq(3).should('contain.text', files[0].sharedTime);
      cy.get('td').eq(4).find('button').should('exist');
    });

    cy.get('tbody tr').eq(1).within(() => {
      cy.get('td').eq(0).within(() => {
        cy.get('span').should('contain.text', files[1].name);
        cy.get('div').should('have.class', 'bg-orange-100');
        cy.get('svg').should('have.class', 'text-orange-600');
      });
      cy.get('td').eq(1).should('contain.text', files[1].size);
      cy.get('td').eq(2).should('contain.text', files[1].sharedBy);
      cy.get('td').eq(3).should('contain.text', files[1].sharedTime);
      cy.get('td').eq(4).find('button').should('exist');
    });
  });

  it('renders MoreVertical button with icon', () => {
    cy.get('tbody tr').first().find('td').eq(4).within(() => {
      cy.get('button').should('exist');
      cy.get('svg').should('have.class', 'text-gray-500');
    });
  });
});