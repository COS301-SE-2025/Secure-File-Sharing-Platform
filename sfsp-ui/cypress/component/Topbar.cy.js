import Topbar from '../../app/dashboard/components/Topbar';
import { DashboardSearchProvider } from '@/app/dashboard/components/DashboardSearchContext';
import '../../app/globals.css';

describe('<Topbar />', () => {
    it('renders search input and reacts to typing', () => {
        cy.mount(
        <DashboardSearchProvider>
            <Topbar />
        </DashboardSearchProvider>
        );

        cy.get('input[placeholder="Search files and folders"]')
        .should('exist')
        .and('have.value', '');

        cy.get('input[placeholder="Search files and folders"]')
        .type('ProjectX')
        .should('have.value', 'ProjectX');
    });

    it('renders ActionButtons', () => {
        cy.mount(
        <DashboardSearchProvider>
            <Topbar />
        </DashboardSearchProvider>
        );

        cy.get('[data-testid="action-buttons"]').should('exist');
    });
});
