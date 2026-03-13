# Requirements Document

## Introduction

This feature ensures that every Module in the system has at least one associated Element_Module. When a Module exists without any Element_Module records, the system shall automatically create a self-referencing Element_Module that inherits the Module's properties. This applies to both existing database records and newly created Modules.

## Glossary

- **Module**: An academic module entity with properties including id_module, code_module, nom_module, type_module, coefficient_module, and credits_module
- **Element_Module**: A sub-component of a Module with properties including id_element, id_module, code_element, nom_element, coefficient_element, and type_element
- **Self_Referencing_Element**: An Element_Module that represents the parent Module itself, created when no other Element_Module records exist
- **Module_Service**: The service component responsible for managing Module and Element_Module relationships
- **Data_Migration_Command**: A command that processes existing database records to ensure compliance with the self-referencing rule

## Requirements

### Requirement 1: Identify Modules Without Elements

**User Story:** As a system administrator, I want to identify all Modules that lack Element_Module records, so that I can ensure data integrity across the system.

#### Acceptance Criteria

1. THE Module_Service SHALL provide a method to query all Modules without associated Element_Module records
2. THE query SHALL return the complete list of Module identifiers that have zero Element_Module children
3. THE query SHALL execute without modifying any database records

### Requirement 2: Create Self-Referencing Elements for Existing Data

**User Story:** As a system administrator, I want to automatically create Self_Referencing_Element records for existing Modules without elements, so that all Modules comply with the new data integrity rule.

#### Acceptance Criteria

1. THE Data_Migration_Command SHALL identify all Modules without Element_Module records
2. WHEN a Module has zero Element_Module records, THE Data_Migration_Command SHALL create a Self_Referencing_Element for that Module
3. THE Self_Referencing_Element SHALL inherit code_element from the parent Module's code_module
4. THE Self_Referencing_Element SHALL inherit nom_element from the parent Module's nom_module
5. THE Self_Referencing_Element SHALL inherit coefficient_element from the parent Module's coefficient_module
6. THE Self_Referencing_Element SHALL inherit type_element from the parent Module's type_module
7. THE Self_Referencing_Element SHALL set id_module to reference the parent Module's id_module
8. THE Data_Migration_Command SHALL log the count of Self_Referencing_Element records created
9. WHEN the Data_Migration_Command completes, THE system SHALL have zero Modules without Element_Module records

### Requirement 3: Automatic Self-Referencing Element Creation for New Modules

**User Story:** As a developer, I want new Modules to automatically receive a Self_Referencing_Element upon creation, so that I don't need to manually create elements for simple modules.

#### Acceptance Criteria

1. WHEN a new Module is created, THE Module_Service SHALL check if Element_Module records will be provided
2. IF no Element_Module records are provided during Module creation, THEN THE Module_Service SHALL create a Self_Referencing_Element
3. THE Self_Referencing_Element SHALL be created within the same database transaction as the Module creation
4. IF the Module creation transaction fails, THEN THE Self_Referencing_Element creation SHALL be rolled back
5. THE Self_Referencing_Element SHALL inherit properties following the same rules as Requirement 2

### Requirement 4: Preserve Existing Elements

**User Story:** As a system administrator, I want Modules with existing Element_Module records to remain unchanged, so that existing data relationships are preserved.

#### Acceptance Criteria

1. WHEN a Module has one or more Element_Module records, THE system SHALL NOT create a Self_Referencing_Element
2. THE Data_Migration_Command SHALL skip Modules that already have Element_Module records
3. WHEN updating a Module, THE system SHALL NOT remove existing Element_Module records
4. WHEN deleting Element_Module records, IF the deletion would result in zero elements, THEN THE system SHALL create a Self_Referencing_Element

### Requirement 5: Self-Referencing Element Identification

**User Story:** As a developer, I want to distinguish Self_Referencing_Element records from manually created elements, so that I can apply appropriate business logic.

#### Acceptance Criteria

1. THE Self_Referencing_Element SHALL be identifiable by comparing code_element with the parent Module's code_module
2. THE Module_Service SHALL provide a method to determine if an Element_Module is a Self_Referencing_Element
3. THE identification method SHALL return true when code_element equals the parent Module's code_module AND nom_element equals the parent Module's nom_module

### Requirement 6: Data Migration Idempotency

**User Story:** As a system administrator, I want to safely run the data migration command multiple times, so that I can recover from errors without creating duplicate records.

#### Acceptance Criteria

1. WHEN the Data_Migration_Command is executed multiple times, THE system SHALL NOT create duplicate Self_Referencing_Element records
2. THE Data_Migration_Command SHALL check for existing Element_Module records before creating a Self_Referencing_Element
3. WHEN a Self_Referencing_Element already exists for a Module, THE Data_Migration_Command SHALL skip that Module
