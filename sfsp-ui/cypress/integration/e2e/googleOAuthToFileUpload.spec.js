describe("End-to-End: Google OAuth to File Upload Journey", () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
        cy.clearAllSessionStorage();
        
        cy.window().then((win) => {
            win.localStorage.removeItem('encryption-store');
            win.sessionStorage.clear();
        });
    });

    describe("Complete User Journey: Registration → Verification → File Upload", () => {
        it("should complete the full journey from Google OAuth registration to successful file upload", () => {
            // Step 1: Start Google OAuth from auth page
            cy.visit("http://localhost:3000/auth");
            
            // Mock Google OAuth initiation
            cy.intercept('GET', '**/api/users/google/auth**', {
                statusCode: 302,
                headers: {
                    'Location': 'https://accounts.google.com/oauth/authorize?...'
                }
            }).as('initiateGoogleAuth');

            // Click Google OAuth button
            cy.get('button').contains(/Sign in with Google|Continue with Google/i, { timeout: 10000 }).click();

            // Step 2: Complete OAuth callback (new user)
            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-e2e-user-123',
                        email: 'e2etest@gmail.com',
                        name: 'E2E Test User',
                        picture: 'https://lh3.googleusercontent.com/a/e2e-user',
                        verified_email: true
                    },
                    tokens: {
                        access_token: 'ya29.e2e-test-token',
                        id_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.e2e.test'
                    }
                }
            }).as('googleCallback');

            cy.intercept('GET', '**/api/users/getUserId/e2etest@gmail.com', {
                statusCode: 404,
                body: { error: 'User not found' }
            }).as('checkUserExists');

            cy.intercept('POST', '**/api/users/google-auth', {
                statusCode: 200,
                body: {
                    success: true,
                    message: 'Account created successfully. Please verify your email.',
                    data: {
                        user: {
                            id: 'e2e-user-uuid-123',
                            username: 'E2E Test User',
                            email: 'e2etest@gmail.com',
                            avatar_url: 'https://lh3.googleusercontent.com/a/e2e-user',
                            is_verified: false,
                            ik_public: 'e2e-mock-ik-public',
                            spk_public: 'e2e-mock-spk-public',
                            opks_public: [],
                            nonce: 'ZTJlLW1vY2stbm9uY2U=', // base64 'e2e-mock-nonce'
                            signedPrekeySignature: 'e2e-mock-signature',
                            salt: 'ZTJlLW1vY2stc2FsdA==' // base64 'e2e-mock-salt'
                        },
                        isNewUser: true
                    }
                }
            }).as('googleAuthRegistration');

            cy.intercept('POST', '**/api/files/addUser', {
                statusCode: 200,
                body: { 
                    success: true, 
                    message: 'User added to PostgreSQL database',
                    userId: 'e2e-user-uuid-123'
                }
            }).as('addUserToPostgres');

            // Navigate to callback URL
            cy.visit("http://localhost:3000/auth/google/callback?code=e2e-test-code&state=e2e-state-123");

            cy.wait('@googleCallback');
            cy.wait('@checkUserExists');
            cy.wait('@googleAuthRegistration');
            cy.wait('@addUserToPostgres');

            // Step 3: Should be redirected to email verification
            cy.url({ timeout: 15000 }).should('include', '/auth/verify-email');
            cy.url().should('include', 'email=e2etest@gmail.com');
            cy.url().should('include', 'userId=e2e-user-uuid-123');

            // Verify the verification page content
            cy.get('h1').contains(/verify|check your email/i, { timeout: 10000 }).should('be.visible');
            cy.get('p').contains('e2etest@gmail.com', { timeout: 5000 }).should('be.visible');

            // Step 4: Mock email verification completion
            cy.intercept('POST', '**/api/users/verify-email', {
                statusCode: 200,
                body: {
                    success: true,
                    message: 'Email verified successfully'
                }
            }).as('verifyEmail');

            cy.intercept('POST', '**/api/users/google-auth', {
                statusCode: 200,
                body: {
                    success: true,
                    message: 'Login successful',
                    data: {
                        user: {
                            id: 'e2e-user-uuid-123',
                            username: 'E2E Test User',
                            email: 'e2etest@gmail.com',
                            avatar_url: 'https://lh3.googleusercontent.com/a/e2e-user',
                            is_verified: true,
                            ik_public: 'e2e-mock-ik-public',
                            spk_public: 'e2e-mock-spk-public',
                            opks_public: [],
                            nonce: 'ZTJlLW1vY2stbm9uY2U=',
                            signedPrekeySignature: 'e2e-mock-signature',
                            salt: 'ZTJlLW1vY2stc2FsdA=='
                        },
                        keyBundle: {
                            ik_private_key: 'ZTJlLW1vY2staWstcHJpdmF0ZQ==', // base64 'e2e-mock-ik-private'
                            spk_private_key: 'ZTJlLW1vY2stc3BrLXByaXZhdGU=', // base64 'e2e-mock-spk-private'
                            opks_private: []
                        },
                        token: 'Bearer e2e-verified-user-token',
                        isNewUser: false
                    }
                }
            }).as('googleAuthVerifiedLogin');

            // Simulate clicking verification link or entering code
            cy.get('button').contains(/verify|continue|resend/i, { timeout: 10000 }).first().click();

            // Step 5: Complete verification and auto-login
            cy.wait('@verifyEmail');

            // Should redirect to auto-login
            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-e2e-user-123',
                        email: 'e2etest@gmail.com',
                        name: 'E2E Test User',
                        verified_email: true
                    }
                }
            }).as('googleCallbackVerified');

            cy.intercept('GET', '**/api/users/getUserId/e2etest@gmail.com', {
                statusCode: 200,
                body: { success: true, data: { userId: 'e2e-user-uuid-123' } }
            }).as('checkVerifiedUserExists');

            cy.visit("http://localhost:3000/auth/google/callback?code=e2e-verified-code&state=e2e-verified-state");

            cy.wait('@googleCallbackVerified');
            cy.wait('@checkVerifiedUserExists');
            cy.wait('@googleAuthVerifiedLogin');

            // Step 6: Should now be on dashboard
            cy.url({ timeout: 15000 }).should('include', '/dashboard');

            // Verify user is properly logged in
            cy.window().then((win) => {
                expect(win.localStorage.getItem('token')).to.equal('e2e-verified-user-token');
                
                const encryptionStore = win.localStorage.getItem('encryption-store');
                expect(encryptionStore).to.not.be.null;
                
                const parsedStore = JSON.parse(encryptionStore);
                expect(parsedStore.state.userId).to.equal('e2e-user-uuid-123');
                expect(parsedStore.state.encryptionKeys).to.exist;
                expect(parsedStore.state.salt).to.equal('ZTJlLW1vY2stc2FsdA==');
                expect(parsedStore.state.nonce).to.equal('ZTJlLW1vY2stbm9uY2U=');
            });

            // Step 7: Navigate to file upload
            cy.get('[href="/dashboard/myFilesV2"]', { timeout: 10000 }).click();

            // Mock file operations
            cy.intercept('POST', '**/api/files/metadata', {
                statusCode: 200,
                body: []
            }).as('getMetadata');

            cy.intercept('POST', '**/api/files/startUpload', {
                statusCode: 200,
                body: { 
                    fileId: 'e2e-upload-file-123',
                    message: 'Upload started successfully'
                }
            }).as('startUpload');

            cy.intercept('POST', '**/api/files/chunkUpload', {
                statusCode: 200,
                body: { message: 'Chunk uploaded successfully' }
            }).as('chunkUpload');

            cy.intercept('POST', '**/api/files/finalizeUpload', {
                statusCode: 200,
                body: { 
                    message: 'Upload finalized successfully',
                    fileId: 'e2e-upload-file-123'
                }
            }).as('finalizeUpload');

            cy.wait('@getMetadata');

            // Step 8: Upload a file
            cy.get('button').contains('Upload Files', { timeout: 10000 }).click();
            cy.get('h2').contains('Upload Files', { timeout: 5000 }).should('be.visible');

            // Create and select a test file
            const fileName = 'e2e-test-upload.txt';
            const fileContent = 'This is an end-to-end test file uploaded by a Google OAuth user after email verification';
            
            cy.get('input[type="file"]').then(input => {
                const file = new File([fileContent], fileName, { type: 'text/plain' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input[0].files = dataTransfer.files;
                cy.wrap(input).trigger('change', { force: true });
            });

            // Verify file is selected
            cy.get('div').contains(fileName, { timeout: 5000 }).should('be.visible');

            // Start upload
            cy.get('button').contains('Upload', { timeout: 5000 }).click();

            // Wait for upload completion
            cy.wait('@startUpload');
            cy.wait('@chunkUpload');
            cy.wait('@finalizeUpload');

            // Step 9: Verify successful upload
            cy.get('div').contains(/upload.*success|completed successfully/i, { timeout: 10000 }).should('be.visible');

            // Verify file appears in file list
            cy.get('div').contains(fileName, { timeout: 10000 }).should('be.visible');

            // Step 10: Verify user state is still correct after upload
            cy.window().then((win) => {
                const encryptionStore = JSON.parse(win.localStorage.getItem('encryption-store'));
                expect(encryptionStore.state.userId).to.equal('e2e-user-uuid-123');
                expect(win.localStorage.getItem('token')).to.equal('e2e-verified-user-token');
            });
        });
    });

    describe("Complete User Journey: Existing User Login → File Upload", () => {
        it("should handle existing Google user login and immediate file upload", () => {
            // Step 1: Start OAuth for existing user
            cy.visit("http://localhost:3000/auth");

            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-existing-e2e-456',
                        email: 'existinge2e@gmail.com',
                        name: 'Existing E2E User',
                        verified_email: true
                    }
                }
            }).as('googleCallback');

            cy.intercept('GET', '**/api/users/getUserId/existinge2e@gmail.com', {
                statusCode: 200,
                body: { success: true, data: { userId: 'existing-e2e-uuid-456' } }
            }).as('checkUserExists');

            cy.intercept('POST', '**/api/users/google-auth', {
                statusCode: 200,
                body: {
                    success: true,
                    message: 'Login successful',
                    data: {
                        user: {
                            id: 'existing-e2e-uuid-456',
                            username: 'Existing E2E User',
                            email: 'existinge2e@gmail.com',
                            is_verified: true,
                            ik_public: 'existing-ik-public',
                            spk_public: 'existing-spk-public',
                            salt: 'ZXhpc3RpbmctZTJlLXNhbHQ=', // base64 'existing-e2e-salt'
                            nonce: 'ZXhpc3RpbmctZTJlLW5vbmNl' // base64 'existing-e2e-nonce'
                        },
                        keyBundle: {
                            ik_private_key: 'ZXhpc3RpbmctaWstcHJpdmF0ZQ==', // base64 'existing-ik-private'
                            spk_private_key: 'ZXhpc3Rpbmctc3BrLXByaXZhdGU=', // base64 'existing-spk-private'
                            opks_private: []
                        },
                        token: 'Bearer existing-e2e-user-token',
                        isNewUser: false
                    }
                }
            }).as('googleAuthLogin');

            cy.intercept('POST', '**/api/files/addUser', {
                statusCode: 200,
                body: { success: true, message: 'User ensured in PostgreSQL database' }
            }).as('addUserToPostgres');

            // Step 2: Complete OAuth login
            cy.visit("http://localhost:3000/auth/google/callback?code=existing-e2e-code&state=existing-state");

            cy.wait('@googleCallback');
            cy.wait('@checkUserExists');
            cy.wait('@googleAuthLogin');
            cy.wait('@addUserToPostgres');

            // Step 3: Should be directly on dashboard (no verification needed)
            cy.url({ timeout: 15000 }).should('include', '/dashboard');

            // Step 4: Immediately navigate to file upload and test
            cy.get('[href="/dashboard/myFilesV2"]', { timeout: 10000 }).click();

            cy.intercept('POST', '**/api/files/metadata', {
                statusCode: 200,
                body: [
                    {
                        id: 'existing-file-1',
                        filename: 'previous-upload.txt',
                        size: 1024,
                        uploadedAt: '2024-01-01T00:00:00Z'
                    }
                ]
            }).as('getMetadata');

            cy.intercept('POST', '**/api/files/startUpload', {
                statusCode: 200,
                body: { fileId: 'existing-user-new-file-789' }
            }).as('startUpload');

            cy.intercept('POST', '**/api/files/chunkUpload', {
                statusCode: 200,
                body: { message: 'Chunk uploaded successfully' }
            }).as('chunkUpload');

            cy.intercept('POST', '**/api/files/finalizeUpload', {
                statusCode: 200,
                body: { 
                    message: 'Upload finalized successfully',
                    fileId: 'existing-user-new-file-789'
                }
            }).as('finalizeUpload');

            cy.wait('@getMetadata');

            // Verify existing files are shown
            cy.get('div').contains('previous-upload.txt', { timeout: 10000 }).should('be.visible');

            // Step 5: Upload new file
            cy.get('button').contains('Upload Files', { timeout: 10000 }).click();
            cy.get('h2').contains('Upload Files', { timeout: 5000 }).should('be.visible');

            const fileName = 'existing-user-new-file.pdf';
            const fileContent = 'New file content for existing user';
            
            cy.get('input[type="file"]').then(input => {
                const file = new File([fileContent], fileName, { type: 'application/pdf' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input[0].files = dataTransfer.files;
                cy.wrap(input).trigger('change', { force: true });
            });

            cy.get('div').contains(fileName, { timeout: 5000 }).should('be.visible');
            cy.get('button').contains('Upload', { timeout: 5000 }).click();

            cy.wait('@startUpload');
            cy.wait('@chunkUpload');
            cy.wait('@finalizeUpload');

            // Step 6: Verify upload success and file list update
            cy.get('div').contains(/upload.*success|completed successfully/i, { timeout: 10000 }).should('be.visible');

            // Both old and new files should be visible
            cy.get('div').contains('previous-upload.txt', { timeout: 5000 }).should('be.visible');
            cy.get('div').contains(fileName, { timeout: 5000 }).should('be.visible');
        });
    });

    describe("Error Recovery Journey", () => {
        it("should handle PostgreSQL user insertion failure and retry", () => {
            cy.visit("http://localhost:3000/auth");

            cy.intercept('GET', '/api/auth/google**', {
                statusCode: 200,
                body: {
                    user: {
                        id: 'google-retry-user-789',
                        email: 'retryuser@gmail.com',
                        name: 'Retry User'
                    }
                }
            }).as('googleCallback');

            cy.intercept('GET', '**/api/users/getUserId/retryuser@gmail.com', {
                statusCode: 200,
                body: { success: true, data: { userId: 'retry-user-uuid-789' } }
            }).as('checkUserExists');

            cy.intercept('POST', '**/api/users/google-auth', {
                statusCode: 200,
                body: {
                    success: true,
                    data: {
                        user: {
                            id: 'retry-user-uuid-789',
                            email: 'retryuser@gmail.com',
                            is_verified: true
                        },
                        token: 'Bearer retry-user-token',
                        keyBundle: { ik_private_key: 'retry-mock-key' }
                    }
                }
            }).as('googleAuthLogin');

            // First PostgreSQL insertion fails
            cy.intercept('POST', '**/api/files/addUser', {
                statusCode: 500,
                body: { error: 'Database connection failed' }
            }).as('addUserToPostgresFail');

            cy.visit("http://localhost:3000/auth/google/callback?code=retry-code&state=retry-state");

            cy.wait('@googleCallback');
            cy.wait('@checkUserExists');
            cy.wait('@googleAuthLogin');
            cy.wait('@addUserToPostgresFail');

            // Should still proceed to dashboard despite PostgreSQL failure
            cy.url({ timeout: 15000 }).should('include', '/dashboard');

            // Try to upload file - should fail
            cy.get('[href="/dashboard/myFilesV2"]', { timeout: 10000 }).click();

            cy.intercept('POST', '**/api/files/metadata', {
                statusCode: 200,
                body: []
            }).as('getMetadata');

            cy.intercept('POST', '**/api/files/startUpload', {
                statusCode: 500,
                body: { error: 'User not found in database' }
            }).as('startUploadFail');

            cy.wait('@getMetadata');

            cy.get('button').contains('Upload Files', { timeout: 10000 }).click();

            const fileName = 'retry-test-file.txt';
            cy.get('input[type="file"]').then(input => {
                const file = new File(['test'], fileName, { type: 'text/plain' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input[0].files = dataTransfer.files;
                cy.wrap(input).trigger('change', { force: true });
            });

            cy.get('button').contains('Upload', { timeout: 5000 }).click();
            cy.wait('@startUploadFail');

            // Error should be displayed
            cy.get('div').contains(/error|failed|User not found/i, { timeout: 10000 }).should('be.visible');

            // Now fix the PostgreSQL connection and retry
            cy.intercept('POST', '**/api/files/addUser', {
                statusCode: 200,
                body: { success: true, message: 'User added to PostgreSQL database' }
            }).as('addUserToPostgresSuccess');

            cy.intercept('POST', '**/api/files/startUpload', {
                statusCode: 200,
                body: { fileId: 'retry-success-file-123' }
            }).as('startUploadSuccess');

            // Retry the upload
            cy.get('button').contains('Upload', { timeout: 5000 }).click();

            cy.wait('@addUserToPostgresSuccess');
            cy.wait('@startUploadSuccess');

            // Should now succeed
            cy.get('div').contains(/upload.*success|completed successfully/i, { timeout: 10000 }).should('be.visible');
        });
    });
});
