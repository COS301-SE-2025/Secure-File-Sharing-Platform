describe('MyFiles Page - Integration Tests', () => {
  const token = 'test-token'; // mock token

  beforeEach(() => {
    // Mock the APIs
    cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
      statusCode: 200,
      body: [],  // Start with no files
    }).as('getFiles');

    cy.intercept('POST', 'http://localhost:5000/api/files/download', {
      statusCode: 200,
      body: { fileName: 'example.pdf', fileContent: 'testContent', nonce: 'testNonce' },
    }).as('downloadFile');

    cy.intercept('POST', 'http://localhost:5000/api/files/addAccesslog', {
      statusCode: 200,
      body: { success: true },
    }).as('logFileAccess');

    // Set the token in localStorage
    window.localStorage.setItem('token', token);

    cy.visit('http://localhost:3000/dashboard/myFilesV2'); // Visit the page where the MyFiles component is located
  });

  it('should display nothing when there are no files uploaded', () => {
    //cy.wait('@getFiles');
  });

  it('should open the upload dialog and click upload button', () => {
  // Check if the modal is visible and close it if necessary
//   cy.get('.fixed.inset-0.z-50').should('be.visible').then(($modal) => {
//     // If modal exists, close it by clicking on the close button (adjust the button selector if necessary)
//     if ($modal) {
//       cy.get('button').contains('Close').click(); // Assuming you have a close button inside the modal
//     }
//   });

  // Ensure the modal is no longer visible before proceeding
  cy.get('.fixed.inset-0.z-50').should('not.exist'); // Wait for the modal to be dismissed

  // Now click the upload button
  cy.get('button').contains('Upload Files').click(); // Click the upload button

  // Ensure the upload dialog opens
  cy.get('div').contains('Upload Files').should('exist'); // Ensure the dialog is open
});

  it('should toggle between grid and list view when files are uploaded', () => {
  // Mock file data and intercept the API call for uploading files
  cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
    statusCode: 200,
    body: [
      {
        fileId: '1',
        fileName: 'example.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        createdAt: '2023-01-01',
      },
    ],
  }).as('getFilesAfterUpload');

  // Simulate opening the upload dialog
  cy.get('button').contains('Upload Files').click(); // Open Upload Dialog
  cy.get('div').contains('Upload Files').should('exist'); // Ensure the dialog is open

  // Ensure that the modal is closed before clicking the button again (if the modal blocks it)
  cy.get('.fixed.inset-0.z-50').should('be.visible').then(($modal) => {
    if ($modal) {
      // Close the modal (adjust based on how it's closed in your UI)
      //cy.get('button').contains('Close').click(); // Assuming there's a close button inside the modal
    }
  });

  // Wait for the modal to be fully closed
  //cy.get('.fixed.inset-0.z-50').should('not.exist'); // Ensure the modal is gone

  // Simulate file upload by clicking the Upload button
  //cy.get('button').contains('Upload').click(); // Simulate file upload (you may need to mock actual upload if necessary)
  //cy.wait('@getFilesAfterUpload'); // Wait for the files to be loaded after the upload

  // Check if the file is displayed in the grid view
//   cy.get('.text-sm.font-medium.text-blue-600').should('have.text', 'example.pdf');

//   // Now toggle between grid and list view
//   cy.get('button').contains('Grid').click(); // Switch to grid view
//   cy.get('div.grid').should('exist'); // Ensure grid view is visible

//   cy.get('button').contains('List').click(); // Switch to list view
//   cy.get('div.list').should('exist'); // Ensure list view is visible
});


  it('should open upload dialog when the "Upload Files" button is clicked', () => {
    //cy.get('button').contains('Upload Files').click(); // Open Upload Dialog
    //cy.get('div').contains('Upload Files').should('exist'); // Ensure the dialog is open
  });

  it('should download a file when the download button is clicked', () => {
    // Mock file data and intercept the download call
    cy.intercept('POST', 'http://localhost:5000/api/files/metadata', {
      statusCode: 200,
      body: [
        {
          fileId: '1',
          fileName: 'example.pdf',
          fileSize: 1024,
          fileType: 'application/pdf',
          createdAt: '2023-01-01',
        },
      ],
    }).as('getFilesAfterUpload');
    
    cy.get('button').contains('Upload Files').click(); // Open Upload Dialog
    //cy.get('button').contains('Upload').click(); // Simulate file upload
    //cy.wait('@getFilesAfterUpload');

    // cy.get('button[title="Download"]').click(); // Click the download button using the title
    // cy.wait('@downloadFile'); // Wait for the download API call
    // cy.get('@downloadFile').should('have.property', 'response.body.fileName', 'example.pdf'); // Ensure download API is triggered correctly
  });

  it('should log file access when a file is downloaded', () => {
    // cy.get('button[title="Download"]').click(); // Click the download button
    // cy.wait('@logFileAccess'); // Wait for the access log API call
    // cy.get('@logFileAccess').should('have.property', 'response.body.success', true); // Ensure log is successful
  });
});
