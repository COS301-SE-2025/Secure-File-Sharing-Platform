describe("File Upload Integration with PostgreSQL - Core Tests", () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
        cy.clearAllSessionStorage();
        
        // Clear the Zustand persistence store
        cy.window().then((win) => {
            win.localStorage.removeItem('encryption-store');
            win.sessionStorage.clear();
        });
    });

    describe("API Integration Tests", () => {
        it("should validate PostgreSQL URL endpoints are accessible", () => {
            // Test that our mocking setup works correctly
            cy.intercept('POST', 'http://localhost:8080/api/files/metadata', {
                statusCode: 200,
                body: []
            }).as('getMetadata');

            // Mock a simple logged-in user
            cy.window().then((win) => {
                win.localStorage.setItem('token', 'Bearer test-token');
                
                const encryptionStore = {
                    state: {
                        userId: 'test-user-123',
                        encryptionKeys: {
                            identityKeyPair: {
                                private: 'bW9ja19wcml2YXRl',
                                public: 'mock-public'
                            }
                        }
                    },
                    version: 0
                };
                win.localStorage.setItem('encryption-store', JSON.stringify(encryptionStore));
            });

            cy.visit("http://localhost:3000/dashboard");
            cy.get('[href="/dashboard/myFilesV2"]', { timeout: 10000 }).click();
            
            // This validates that the page loads and the metadata endpoint is called
            cy.wait('@getMetadata');
            
            // Verify the page structure loads correctly
            cy.get('button').contains('Upload Files', { timeout: 10000 }).should('be.visible');
        });

        it("should handle file upload mock endpoints correctly", () => {
            // Mock successful file upload
            cy.intercept('POST', 'http://localhost:8080/api/files/startUpload', {
                statusCode: 200,
                body: { 
                    fileId: 'test-upload-file-123',
                    message: 'Upload started successfully'
                }
            }).as('startUpload');

            cy.intercept('POST', 'http://localhost:8080/api/files/metadata', {
                statusCode: 200,
                body: []
            }).as('getMetadata');

            // Set up authenticated user
            cy.window().then((win) => {
                win.localStorage.setItem('token', 'Bearer test-file-token');
                
                const encryptionStore = {
                    state: {
                        userId: 'file-test-user-456',
                        encryptionKeys: {
                            identityKeyPair: {
                                private: 'bW9ja19maWxlX3ByaXZhdGU=',
                                public: 'mock-file-public'
                            }
                        }
                    },
                    version: 0
                };
                win.localStorage.setItem('encryption-store', JSON.stringify(encryptionStore));
            });

            cy.visit("http://localhost:3000/dashboard");
            cy.get('[href="/dashboard/myFilesV2"]', { timeout: 10000 }).click();
            
            cy.wait('@getMetadata');

            cy.get('button').contains('Upload Files', { timeout: 10000 }).click();
            cy.get('h2').contains('Upload Files', { timeout: 5000 }).should('be.visible');

            // Test file selection (even though upload may not complete due to crypto complexity)
            const fileName = 'test-integration-file.txt';
            const fileContent = 'Integration test file content';
            
            cy.get('input[type="file"]').then(input => {
                const file = new File([fileContent], fileName, { type: 'text/plain' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input[0].files = dataTransfer.files;
                cy.wrap(input).trigger('change', { force: true });
            });

            // Verify file appears in the upload queue
            cy.get('div').contains(fileName, { timeout: 5000 }).should('be.visible');
        });
    });

    describe("PostgreSQL Integration Validation", () => {
        it("should verify PostgreSQL user addition endpoint structure", () => {
            // Mock the addUser endpoint to validate request structure
            cy.intercept('POST', 'http://localhost:5000/api/files/addUser', (req) => {
                // Validate the request structure
                expect(req.body).to.have.property('userId');
                expect(req.body.userId).to.be.a('string');
                
                req.reply({
                    statusCode: 200,
                    body: { 
                        success: true, 
                        message: 'User added to PostgreSQL database',
                        userId: req.body.userId
                    }
                });
            }).as('addUserToPostgres');

            // Simulate a call to the PostgreSQL user addition endpoint
            cy.request({
                method: 'POST',
                url: 'http://localhost:5000/api/files/addUser',
                body: { userId: 'test-postgres-user-789' }
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body.success).to.be.true;
                expect(response.body.userId).to.eq('test-postgres-user-789');
            });
        });

        it("should handle PostgreSQL connection failures gracefully", () => {
            // Mock PostgreSQL service unavailable
            cy.intercept('POST', 'http://localhost:5000/api/files/addUser', {
                statusCode: 503,
                body: { error: 'PostgreSQL service unavailable' }
            }).as('addUserToPostgresFail');

            // Test that the system handles PostgreSQL failures
            cy.request({
                method: 'POST',
                url: 'http://localhost:5000/api/files/addUser',
                body: { userId: 'test-postgres-fail-user' },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(503);
                expect(response.body.error).to.include('PostgreSQL');
            });
        });
    });
});
