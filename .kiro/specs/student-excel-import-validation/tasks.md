# Implementation Plan

- [x] 1. Update backend validation in EtudiantController





  - [x] 1.1 Remove email auto-generation logic from bulkStore method


    - Remove the code that generates `prenom.nom@usmba.ac.ma` when email is missing
    - Make `mail_academique` strictly required with no fallback
    - _Requirements: 1.1, 2.1_

  - [x] 1.2 Enhance validation error response structure

    - Return structured errors with row number, student data, and specific error messages
    - Ensure all validation errors are collected before returning response
    - _Requirements: 2.2, 3.1_
  - [ ]* 1.3 Write property test for required field validation
    - **Property 1: Required field validation rejects incomplete data**
    - **Validates: Requirements 1.1, 2.1**
  - [ ]* 1.4 Write property test for error response structure
    - **Property 5: Error response structure completeness**
    - **Validates: Requirements 2.2, 3.1**

- [x] 2. Update frontend validation in Display.jsx





  - [x] 2.1 Remove email auto-generation from handleFileSelect


    - Remove the code that generates email from nom/prenom
    - Add validation error for missing or invalid email
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 Implement duplicate email detection within file


    - Check for duplicate emails in the imported data
    - Mark all duplicate rows with appropriate error message
    - _Requirements: 1.3_
  - [x] 2.3 Implement existing email collision detection


    - Check imported emails against existing students in database
    - Mark colliding rows with appropriate error message
    - _Requirements: 1.4_
  - [ ]* 2.4 Write property test for invalid email format rejection
    - **Property 2: Invalid email format rejection**
    - **Validates: Requirements 1.2**
  - [ ]* 2.5 Write property test for duplicate email detection
    - **Property 3: Duplicate email detection within file**
    - **Validates: Requirements 1.3**

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Improve error display and import flow





  - [x] 4.1 Update import preview to show validation status per row


    - Add visual indicators (green/red) for valid/invalid rows
    - Show specific errors inline for each invalid row
    - _Requirements: 4.1, 4.2_
  - [x] 4.2 Update import button state logic


    - Disable import when no valid rows exist
    - Enable "Import valid only" option when mixed valid/invalid
    - _Requirements: 4.3_
  - [x] 4.3 Filter payload to only include valid rows


    - Ensure handleBulkImport only sends validated rows
    - Update summary counts to reflect actual import
    - _Requirements: 4.4, 3.3_
  - [ ]* 4.4 Write property test for import summary accuracy
    - **Property 6: Import summary accuracy**
    - **Validates: Requirements 3.3**
  - [ ]* 4.5 Write property test for valid rows only in payload
    - **Property 8: Only valid rows sent to backend**
    - **Validates: Requirements 4.4**

- [x] 5. Enhance error reporting





  - [x] 5.1 Update downloadErrorReport function


    - Include all error details in Excel export
    - Add timestamp and summary information
    - _Requirements: 3.2_
  - [x] 5.2 Improve toast notifications


    - Show appropriate success/error/partial messages
    - Include counts in notification messages
    - _Requirements: 3.4_

- [ ] 6. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
