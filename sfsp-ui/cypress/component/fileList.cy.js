import React from 'react';
import { FileList } from '../../app/dashboard/myFilesV2/fileList';
import '../../app/globals.css';

describe('FileList Component', () => {
    const mockFiles = [
        {
            id: 1,
            name: 'Document.pdf',
            type: 'pdf',
            size: '2.5 MB',
            modified: '2024-01-15',
            starred: false,
        },
        {
            id: 2,
            name: 'Image.jpg',
            type: 'image',
            size: '1.8 MB',
            modified: '2024-01-14',
            starred: true,
        },
        {
            id: 3,
            name: 'Video.mp4',
            type: 'video',
            size: '25.3 MB',
            modified: '2024-01-13',
            starred: false,
        },
        {
            id: 4,
            name: 'Folder1',
            type: 'folder',
            size: '--',
            modified: '2024-01-12',
            starred: false,
        },
        {
            id: 5,
            name: 'Unknown.xyz',
            type: 'unknown',
            size: '500 KB',
            modified: '2024-01-11',
            starred: false,
        },
    ];

    const mockProps = {
        files: mockFiles,
        onShare: cy.stub().as('onShare'),
        onViewDetails: cy.stub().as('onViewDetails'),
        onViewActivity: cy.stub().as('onViewActivity'),
        onDownload: cy.stub().as('onDownload'),
        onDelete: cy.stub().as('onDelete'),
    };

    beforeEach(() => {
        cy.window().then((win) => {
        win.localStorage.setItem('token', 'mock-token-123');
        });

        cy.intercept('POST', 'http://localhost:5000/api/files/addTags', {
        statusCode: 200,
        body: { success: true },
        }).as('addTags');

        cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 200,
        body: {
            success: true,
            data: {
            id: 1,
            email: 'test@example.com',
            },
        },
        }).as('getProfile');

        cy.intercept('POST', 'http://localhost:5000/api/files/addAccesslog', {
        statusCode: 200,
        body: { success: true },
        }).as('addAccesslog');

        cy.mount(<FileList {...mockProps} />);
    });

    it('renders the file table with headers', () => {
        cy.get('table').should('be.visible');
        cy.get('thead tr th').should('have.length', 4);
        cy.get('thead tr th').eq(0).should('contain.text', 'Name');
        cy.get('thead tr th').eq(1).should('contain.text', 'Size');
        cy.get('thead tr th').eq(2).should('contain.text', 'Modified');
        cy.get('thead tr th').eq(3).should('contain.text', 'Actions');
    });

    it('displays all files with correct data', () => {
        cy.get('tbody tr').should('have.length', mockFiles.length);
        
        cy.get('tbody tr').eq(0).within(() => {
        cy.get('td').eq(0).should('contain.text', 'Document.pdf');
        cy.get('td').eq(1).should('contain.text', '2.5 MB');
        cy.get('td').eq(2).should('contain.text', '2024-01-15');
        });

        cy.get('tbody tr').eq(1).within(() => {
        cy.get('td').eq(0).should('contain.text', 'Image.jpg');
        cy.get('[data-lucide="star"]').should('exist');
        });
    });

    it('displays correct icons for different file types', () => {
        cy.get('tbody tr').eq(0).find('[data-lucide="file-text"]').should('exist'); // PDF
        cy.get('tbody tr').eq(1).find('[data-lucide="image"]').should('exist'); // Image
        cy.get('tbody tr').eq(2).find('[data-lucide="video"]').should('exist'); // Video  
        cy.get('tbody tr').eq(3).find('[data-lucide="folder"]').should('exist'); // Folder
        cy.get('tbody tr').eq(4).find('[data-lucide="file"]').should('exist'); // Unknown type
    });

    it('handles share button clicks', () => {
        cy.get('tbody tr').eq(0).find('[data-lucide="share"]').click();
        cy.get('@onShare').should('have.been.calledWith', mockFiles[0]);
    });

    it('handles download button clicks', () => {
        cy.get('tbody tr').eq(0).find('[data-lucide="download"]').click();
        cy.get('@onDownload').should('have.been.calledWith', mockFiles[0]);
    });

    it('shows context menu on right click', () => {
        cy.get('tbody tr').eq(0).rightclick();
        
        cy.get('.absolute.z-50').should('be.visible');
        cy.get('.absolute.z-50').within(() => {
        cy.contains('Share').should('be.visible');
        cy.contains('Download').should('be.visible');
        cy.contains('View Details').should('be.visible');
        cy.contains('Activity Logs').should('be.visible');
        cy.contains('Delete').should('be.visible');
        });
    });

    it('handles context menu share action', () => {
        cy.get('tbody tr').eq(0).rightclick();
        cy.contains('Share').click();
        
        cy.get('@onShare').should('have.been.calledWith', mockFiles[0]);
        cy.get('.absolute.z-50').should('not.exist');
    });

    it('handles context menu download action', () => {
        cy.get('tbody tr').eq(0).rightclick();
        cy.contains('Download').click();
        
        cy.get('@onDownload').should('have.been.calledWith', mockFiles[0]);
        cy.get('.absolute.z-50').should('not.exist');
    });

    it('handles context menu view details action', () => {
        cy.get('tbody tr').eq(0).rightclick();
        cy.contains('View Details').click();
        
        cy.get('@onViewDetails').should('have.been.calledWith', mockFiles[0]);
        cy.get('.absolute.z-50').should('not.exist');
    });

    it('handles context menu activity logs action', () => {
        cy.get('tbody tr').eq(0).rightclick();
        cy.contains('Activity Logs').click();
        
        cy.get('@onViewActivity').should('have.been.calledWith', mockFiles[0]);
        cy.get('.absolute.z-50').should('not.exist');
    });

    it('closes context menu when clicking outside', () => {
        cy.get('tbody tr').eq(0).rightclick();
        cy.get('.absolute.z-50').should('be.visible');
        
        cy.get('body').click();
        cy.get('.absolute.z-50').should('not.exist');
    });

    it('handles delete action with API calls', () => {
        cy.get('tbody tr').eq(0).rightclick();
        cy.contains('Delete').click();
        
        cy.wait('@addTags').then((interception) => {
        expect(interception.request.body).to.deep.include({
            fileId: mockFiles[0].id,
        });
        expect(interception.request.body.tags).to.include('deleted');
        expect(interception.request.body.tags[1]).to.match(/deleted_time:/);
        });
        
        cy.wait('@getProfile');
        cy.wait('@addAccesslog').then((interception) => {
        expect(interception.request.body).to.deep.include({
            file_id: mockFiles[0].id,
            user_id: 1,
            action: 'deleted',
            message: 'User test@example.com deleted the file.',
        });
        });
        
        cy.get('@onDelete').should('have.been.calledWith', mockFiles[0]);
        cy.get('.absolute.z-50').should('not.exist');
    });

    it('handles delete API failure gracefully', () => {
        cy.intercept('POST', 'http://localhost:5000/api/files/addTags', {
        statusCode: 500,
        body: { error: 'Server error' },
        }).as('addTagsError');

        cy.window().then((win) => {
        cy.stub(win, 'alert').as('alertStub');
        });

        cy.get('tbody tr').eq(0).rightclick();
        cy.contains('Delete').click();
        
        cy.wait('@addTagsError');
        cy.get('@alertStub').should('have.been.calledWith', 'Failed to delete file');
        cy.get('.absolute.z-50').should('not.exist');
    });

    it('handles delete when no token is present', () => {
        cy.window().then((win) => {
        win.localStorage.removeItem('token');
        });

        cy.get('tbody tr').eq(0).rightclick();
        cy.contains('Delete').click();
        
        cy.wait('@addTags');
        cy.get('@getProfile').should('not.have.been.called');
        cy.get('@addAccesslog').should('not.have.been.called');
        cy.get('@onDelete').should('have.been.calledWith', mockFiles[0]);
    });

    it('handles profile fetch failure during delete', () => {
        cy.intercept('GET', 'http://localhost:5000/api/users/profile', {
        statusCode: 401,
        body: { error: 'Unauthorized' },
        }).as('getProfileError');

        cy.get('tbody tr').eq(0).rightclick();
        cy.contains('Delete').click();
        
        cy.wait('@addTags');
        cy.wait('@getProfileError');
        cy.get('@addAccesslog').should('not.have.been.called');
        cy.get('@onDelete').should('have.been.calledWith', mockFiles[0]);
    });

    it('positions context menu correctly', () => {
        cy.get('tbody tr').eq(0).rightclick();
        
        cy.get('.absolute.z-50').should('have.css', 'position', 'absolute');
        cy.get('.absolute.z-50').should('be.visible');
    });

    it('applies hover effects to table rows', () => {
        cy.get('tbody tr').eq(0).trigger('mouseover');
        cy.get('tbody tr').eq(0).should('have.class', 'hover:bg-gray-200');
    });

    it('renders empty table when no files provided', () => {
        cy.mount(<FileList {...mockProps} files={[]} />);
        
        cy.get('tbody tr').should('have.length', 0);
        cy.get('thead').should('be.visible');
    });

    it('handles missing optional props gracefully', () => {
        const minimalProps = { files: mockFiles };
        cy.mount(<FileList {...minimalProps} />);
        
        cy.get('tbody tr').should('have.length', mockFiles.length);
        
        cy.get('tbody tr').eq(0).find('[data-lucide="share"]').click();
        cy.get('tbody tr').eq(0).find('[data-lucide="download"]').click();
    });

    it('handles keyboard navigation', () => {
        cy.get('tbody tr').eq(0).rightclick();
        cy.get('.absolute.z-50').should('be.visible');
        
        cy.get('body').type('{esc}');
        cy.get('.absolute.z-50').should('not.exist');
    });

    it('displays star icon only for starred files', () => {
        cy.get('tbody tr').eq(1).find('[data-lucide="star"]').should('exist');
        
        cy.get('tbody tr').eq(0).find('[data-lucide="star"]').should('not.exist');
        cy.get('tbody tr').eq(2).find('[data-lucide="star"]').should('not.exist');
    });
});