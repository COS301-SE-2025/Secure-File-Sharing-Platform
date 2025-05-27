import AccessLogsPage from '@/app/dashboard/accessLogs/page';
import { DashboardSearchContext } from '@/app/dashboard/components/DashboardSearchContext';

const mountWithSearch = (search = '') => {
    cy.mount(
        <DashboardSearchContext.Provider value={{ search }}>
            <AccessLogsPage />
        </DashboardSearchContext.Provider>
    );
};

describe('<AccessLogsPage />', () => {

    it('renders logs by default', () => {
        const mockContext = {
            search: '',
            setSearch: cy.stub(),
        };

        cy.mount(
            <DashboardSearchContext.Provider value={mockContext}>
                <AccessLogsPage />
            </DashboardSearchContext.Provider>
        );

        cy.contains('Access Logs').should('be.visible');
        cy.get('tbody tr').should('have.length', 4);
    });

    it('filters logs by action (Shared)', () => {
        const mockContext = {
            search: '',
            setSearch: () => { },
        };

        cy.mount(
            <DashboardSearchContext.Provider value={mockContext}>
                <AccessLogsPage />
            </DashboardSearchContext.Provider>
        );

        cy.contains('select', 'All actions')
            .select('Shared');

        cy.get('table tbody tr').each(($row) => {
            cy.wrap($row)
                .find('td')
                .eq(1)
                .should('contain.text', 'Shared');
        });

        cy.get('table tbody tr').should('have.length', 1);
    });

    it('shows empty state with no matches', () => {
        mountWithSearch('nothingmatches');
        cy.get('[data-testid="log-row"]').should('have.length', 0);
        cy.get('table tbody').should('be.empty');
    });

    describe('AccessLogsPage filters', () => {
        it('allows changing the date filter', () => {
            cy.mount(
                <DashboardSearchContext.Provider value={{ search: '', setSearch: () => { } }}>
                    <AccessLogsPage />
                </DashboardSearchContext.Provider>
            );

            cy.get('select.bg-gray-200') 
                .first() 
                .should('have.value', 'Last 7 days')
                .select('Last 30 days') 
                .should('have.value', 'Last 30 days'); 
        });
    });

    it('has Export Logs button', () => {
        mountWithSearch();
        cy.contains('Export logs').should('be.visible').click(); 
    });
});
