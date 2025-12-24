# Requirements Document

## Introduction

This feature improves the student Excel import functionality in the "Personnes/Étudiants" module. Currently, when importing students via Excel, the system auto-generates email addresses if they are missing or invalid. This behavior should be changed to require valid email addresses in the Excel file and provide comprehensive error management on both backend and frontend.

## Glossary

- **Student Import System**: The component responsible for bulk importing student data from Excel files
- **Academic Email (mail_academique)**: The required institutional email address for each student
- **CNE**: Code National de l'Étudiant - unique student identifier
- **Validation Error**: An error that occurs when imported data does not meet the required format or constraints
- **Import Error Report**: A downloadable Excel file containing details of all validation errors

## Requirements

### Requirement 1

**User Story:** As an administrator, I want the system to require valid email addresses in the Excel import file, so that I can ensure all student records have proper contact information.

#### Acceptance Criteria

1. WHEN a user imports an Excel file with a missing email address THEN the Student Import System SHALL reject that row and report a validation error
2. WHEN a user imports an Excel file with an invalid email format THEN the Student Import System SHALL reject that row and report a validation error
3. WHEN a user imports an Excel file with a duplicate email (within the file) THEN the Student Import System SHALL reject the duplicate rows and report validation errors
4. WHEN a user imports an Excel file with an email that already exists in the database THEN the Student Import System SHALL reject that row and report a validation error

### Requirement 2

**User Story:** As an administrator, I want comprehensive backend validation for Excel imports, so that invalid data never enters the database.

#### Acceptance Criteria

1. WHEN the backend receives import data THEN the Student Import System SHALL validate all required fields (cne, nom, prenom, mail_academique) before processing
2. WHEN the backend detects validation errors THEN the Student Import System SHALL return a structured error response with row numbers and specific error messages
3. WHEN the backend processes a valid import THEN the Student Import System SHALL use database transactions to ensure atomicity
4. IF a database error occurs during import THEN the Student Import System SHALL rollback all changes and return an error response

### Requirement 3

**User Story:** As an administrator, I want clear error feedback in the frontend, so that I can quickly identify and fix issues in my Excel file.

#### Acceptance Criteria

1. WHEN validation errors occur THEN the Student Import System SHALL display a detailed error table showing row number, student data, and specific errors
2. WHEN validation errors occur THEN the Student Import System SHALL provide a downloadable error report in Excel format
3. WHEN partial import is possible THEN the Student Import System SHALL show a summary with counts of successful imports and errors
4. WHEN the import completes THEN the Student Import System SHALL display appropriate success or error toast notifications

### Requirement 4

**User Story:** As an administrator, I want the import preview to clearly distinguish valid and invalid rows, so that I can review data before importing.

#### Acceptance Criteria

1. WHEN an Excel file is loaded THEN the Student Import System SHALL display a preview with validation status for each row
2. WHEN displaying the preview THEN the Student Import System SHALL visually distinguish valid rows (green) from invalid rows (red)
3. WHEN invalid rows exist THEN the Student Import System SHALL disable the import button until errors are resolved or user chooses to import only valid rows
4. WHEN the user clicks import THEN the Student Import System SHALL only send valid rows to the backend
