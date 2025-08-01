import TrashPage from '@/app/dashboard/trash/page';

describe('<TrashPage />', () => {
  beforeEach(() => {
    cy.mount(<TrashPage />);
  });

  it('renders the Trash title and subtitle', () => {
    cy.contains('h1', 'Trash').should('be.visible');
    cy.contains('Recently deleted files').should('be.visible');
  });

  it('renders a table with files', () => {
    cy.contains('Trash').should('be.visible');
    cy.contains('Clear Trash').should('be.visible');
  });

  it('has a Restore button for each file', () => {
    cy.get('button').filter(':contains("Clear Trash")')
  });
});
