import React from 'react';
import FileCard from '../../app/dashboard/components/FileCard';
import mountWithAppRouter from '../support/mountWithAppRouter';

describe('FileCard component', () => {
    const documentFile = {
        name: 'Roadmap.xlsx',
        size: '1.8 MB',
        sharedBy: 'Robert Fox',
        sharedTime: '5 days ago',
        type: 'document',
    };

    const imageFile = {
        name: 'Banner.png',
        size: '850 KB',
        sharedBy: 'Emily Wilson',
        sharedTime: '1 week ago',
        type: 'image',
    };

    it('renders document file ', () => {
        mountWithAppRouter(<FileCard file={documentFile} />);

        cy.get('h3').should('contain.text', documentFile.name);
        cy.get('p').first().should('contain.text', documentFile.size);

        cy.contains(`Shared by ${documentFile.sharedBy}`).should('exist');
        cy.contains(documentFile.sharedTime).should('exist');

        cy.get('div.w-16.h-16').should('have.class', 'bg-blue-100');
        cy.get('svg').should('have.class', 'text-blue-600');
    });

    it('renders image file ', () => {
        mountWithAppRouter(<FileCard file={imageFile} />);

        cy.get('h3').should('contain.text', imageFile.name);
        cy.get('p').first().should('contain.text', imageFile.size);

        cy.contains(`Shared by ${imageFile.sharedBy}`).should('exist');
        cy.contains(imageFile.sharedTime).should('exist');

        cy.get('div.w-16.h-16').should('have.class', 'bg-orange-100');
        cy.get('svg').should('have.class', 'text-orange-600');
    });

    it('shows MoreVertical button', () => {
        mountWithAppRouter(<FileCard file={documentFile} />);

        cy.get('div.absolute.top-3.right-3.opacity-0.group-hover\\:opacity-100').invoke('css', 'opacity', '1');

        cy.get('button.p-1.rounded-md').should('be.visible').find('svg').should('exist');
    });

});
