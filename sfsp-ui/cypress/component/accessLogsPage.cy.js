import React from 'react';
import AccessLogsPage from '@/app/dashboard/accessLogs/page';
import { DashboardSearchContext } from '@/app/dashboard/components/DashboardSearchContext';

const mountWithSearch = (search = '') => {
    cy.mount(
        <DashboardSearchContext.Provider value={{ search }}>
            <AccessLogsPage />
        </DashboardSearchContext.Provider>
    );
};

it('shows empty state -no matches', () => {
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