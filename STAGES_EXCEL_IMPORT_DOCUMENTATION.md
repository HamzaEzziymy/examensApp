# Stages Excel Import Feature

## Overview
Added Excel import functionality to the Stages management system, allowing bulk import of stage data from Excel files.

## Implementation Details

### Backend Changes
- **StageController.php**: Added `bulkStore()` method to handle bulk import of stages
- **Routes**: Uses existing `inscriptions.stages.store` route with array detection
- **Validation**: Full validation for each imported stage with duplicate detection
- **Error Handling**: Comprehensive error handling with rollback on failure

### Frontend Changes
- **Display.jsx**: Added Excel import modal with:
  - File upload interface
  - Real-time preview of imported data
  - Error detection and validation
  - Summary statistics
  - Batch processing confirmation

### Excel Format Requirements

#### Required Columns:
- **CNE**: Code National Étudiant (must exist in inscriptions_pedagogiques)
- **Nom_Hopital**: Hospital name
- **Date_Debut**: Start date (YYYY-MM-DD format)
- **Date_Fin**: End date (YYYY-MM-DD format)

#### Optional Columns:
- **Service**: Hospital service/department
- **Encadrant_Hopital**: Hospital supervisor name
- **Note_Stage**: Stage grade (0-20)

#### Alternative Column Names Supported:
- CNE: `CNE`, `cne`
- Nom_Hopital: `Nom_Hopital`, `nom_hopital`, `Nom Hopital`
- Service: `Service`, `service`
- Date_Debut: `Date_Debut`, `date_debut`, `Date Debut`
- Date_Fin: `Date_Fin`, `date_fin`, `Date Fin`
- Encadrant_Hopital: `Encadrant_Hopital`, `encadrant_hopital`, `Encadrant Hopital`
- Note_Stage: `Note_Stage`, `note_stage`, `Note Stage`

### Sample Excel Template

| CNE | Nom_Hopital | Service | Date_Debut | Date_Fin | Encadrant_Hopital | Note_Stage |
|-----|-------------|---------|------------|----------|-------------------|------------|
| 12345678 | CHU Hassan II | Cardiologie | 2024-01-15 | 2024-02-15 | Dr. Ahmed Benali | 16.5 |
| 87654321 | Hôpital Ibn Sina | Neurologie | 2024-02-01 | 2024-03-01 | Dr. Fatima Zahra | 18.0 |

### Features
- **Real-time Validation**: Validates data as soon as file is selected
- **Error Detection**: Shows specific errors for each row
- **Duplicate Prevention**: Prevents duplicate stages (same student, hospital, dates)
- **Preview Interface**: Shows formatted preview before import
- **Statistics**: Displays total, valid, and error counts
- **Batch Processing**: Imports all valid records in a single transaction

### Error Handling
- Missing required fields
- Invalid CNE (student not found)
- Invalid date formats
- Date logic errors (end date before start date)
- Invalid grade values (outside 0-20 range)
- Database constraint violations

### User Interface
- Gray "Template" button to download Excel template (client-side generation)
- Purple "Import Excel" button in the header
- Comprehensive modal with instructions and template download
- Drag-and-drop file upload
- Color-coded preview table (red for errors, white for valid)
- Progress indicators and confirmation dialogs

### Template Download Feature
- **Method**: Client-side generation using XLSX.writeFile()
- **Filename**: `template_stages.xlsx`
- **Implementation**: JavaScript function in Display component
- **Content**: Two sheets:
  - **Template Sheet**: Headers and 3 sample records
  - **Instructions Sheet**: Comprehensive rules and examples
- **Styling**: Matches Inscriptions Pédagogiques pattern

## Usage Instructions
1. **Download Template**: Click gray "Template" button to download Excel template
2. **Fill Template**: Complete the Excel file with your stage data
3. **Import Data**: Click "Import Excel" button in Stages management
4. **Select File**: Choose your completed Excel file
5. **Review Preview**: Check the preview and fix any errors
6. **Import**: Click "Importer" to process valid records
7. **Confirmation**: System will show success message with import statistics

## Technical Notes
- Uses `xlsx` library for both Excel file parsing and template generation
- Client-side template generation (no server requests for template)
- Implements transaction-based import for data integrity
- Supports both .xlsx and .xls file formats
- Maximum preview shows first 20 rows for performance
- Error messages limited to first 10 for readability
- Template generation follows same pattern as Inscriptions Pédagogiques