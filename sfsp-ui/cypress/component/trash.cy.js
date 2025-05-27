import TrashPage from '@/app/dashboard/trash/page';

describe('<TrashPage />', () => {
  beforeEach(() => {
    cy.mount(<TrashPage />);
  });

  it('renders the Trash title and subtitle', () => {
    cy.contains('h1', 'Trash').should('be.visible');
    cy.contains('Recently deleted files').should('be.visible');
  });

  it('renders a table with trashed files', () => {
    cy.contains('Old_Report.pdf').should('be.visible');
    cy.contains('Draft_Plan.docx').should('be.visible');
    cy.contains('1.2 MB').should('be.visible');
    cy.contains('870 KB').should('be.visible');
  });

  it('has a Restore button for each trashed file', () => {
    cy.get('button').filter(':contains("Restore")').should('have.length', 2);
  });

  it('shows alert when clicking "Clear Trash"', () => {
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('alert');
    });
    cy.contains('button', 'Clear Trash').click();
    cy.get('@alert').should('have.been.calledWith', 'Trash Files Cleared');
  });
});
