import React from 'react';
import FileCard from '../../app/dashboard/components/FileCard';

describe('FileCard', () => {
const imageFile = {
    name: 'photo.png',
    size: '2.1 MB',
    sharedBy: 'Alice',
    sharedTime: '2025-05-25 12:00',
    type: 'image',
};

const documentFile = {
    name: 'report.pdf',
    size: '850 KB',
    sharedBy: 'Bob',
    sharedTime: '2025-05-24 09:30',
    type: 'document',
};

it('renders an image file card correctly', () => {
    cy.mount(<FileCard file={imageFile} />);

    cy.contains(imageFile.name).should('exist');
    cy.contains(imageFile.size).should('exist');
    cy.contains(`Shared by ${imageFile.sharedBy}`).should('exist');
    cy.contains(imageFile.sharedTime).should('exist');

    cy.get('div')
        .filter(`.bg-orange-100, .dark\\:bg-orange-900`)
        .should('exist');

        cy.get('button').find('svg').should('exist');
});

it('renders a document file card correctly', () => {
    cy.mount(<FileCard file={documentFile} />);

    cy.contains(documentFile.name).should('exist');
    cy.contains(documentFile.size).should('exist');
    cy.contains(`Shared by ${documentFile.sharedBy}`).should('exist');
    cy.contains(documentFile.sharedTime).should('exist');

    cy.get('div')
        .filter(`.bg-blue-100, .dark\\:bg-blue-900`)
        .should('exist');

        cy.get('button').find('svg').should('exist');
    });
});
