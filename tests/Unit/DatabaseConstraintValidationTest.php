<?php

namespace Tests\Unit;

use App\Models\ElementModule;
use App\Models\Module;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Validates: Requirements 2.3, 2.7
 * 
 * Tests to verify database constraints are properly configured and enforced
 */
class DatabaseConstraintValidationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test unique constraint on [id_module, code_element]
     * Validates Requirement 2.3: Self-referencing element inherits code_element from parent Module's code_module
     * Validates Requirement 2.7: Self-referencing element sets id_module to reference the parent Module's id_module
     */
    public function test_unique_constraint_on_id_module_and_code_element(): void
    {
        // Create a module
        $module = Module::create([
            'code_module' => 'CONST-001',
            'nom_module' => 'Constraint Test Module',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        // Create first element
        ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'ELEM-001',
            'nom_element' => 'Element 1',
            'type_element' => 'COURS',
            'coefficient' => 1.0,
        ]);

        // Attempt to create duplicate element with same id_module and code_element
        $this->expectException(QueryException::class);
        
        ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'ELEM-001', // Duplicate code_element for same module
            'nom_element' => 'Element 1 Duplicate',
            'type_element' => 'TP',
            'coefficient' => 0.5,
        ]);
    }

    /**
     * Test that same code_element can exist for different modules
     */
    public function test_same_code_element_allowed_for_different_modules(): void
    {
        // Create two different modules
        $module1 = Module::create([
            'code_module' => 'CONST-002',
            'nom_module' => 'Module 1',
            'type_module' => 'CONNAISSANCE',
            'credits' => 3.0,
        ]);

        $module2 = Module::create([
            'code_module' => 'CONST-003',
            'nom_module' => 'Module 2',
            'type_module' => 'HORIZONTAL',
            'credits' => 4.0,
        ]);

        // Create elements with same code_element but different id_module
        $element1 = ElementModule::create([
            'id_module' => $module1->id_module,
            'code_element' => 'SHARED-CODE',
            'nom_element' => 'Element for Module 1',
            'type_element' => 'COURS',
            'coefficient' => 1.0,
        ]);

        $element2 = ElementModule::create([
            'id_module' => $module2->id_module,
            'code_element' => 'SHARED-CODE', // Same code but different module
            'nom_element' => 'Element for Module 2',
            'type_element' => 'COURS',
            'coefficient' => 1.0,
        ]);

        // Both should exist successfully
        $this->assertDatabaseHas('elements_module', [
            'id_element' => $element1->id_element,
            'id_module' => $module1->id_module,
            'code_element' => 'SHARED-CODE',
        ]);

        $this->assertDatabaseHas('elements_module', [
            'id_element' => $element2->id_element,
            'id_module' => $module2->id_module,
            'code_element' => 'SHARED-CODE',
        ]);
    }

    /**
     * Test foreign key constraint on id_module
     * Validates Requirement 2.7: Self-referencing element sets id_module to reference the parent Module's id_module
     */
    public function test_foreign_key_constraint_on_id_module(): void
    {
        // Attempt to create element with non-existent module id
        $this->expectException(QueryException::class);
        
        ElementModule::create([
            'id_module' => 99999, // Non-existent module
            'code_element' => 'INVALID-ELEM',
            'nom_element' => 'Invalid Element',
            'type_element' => 'COURS',
            'coefficient' => 1.0,
        ]);
    }

    /**
     * Test cascade delete behavior through foreign key constraint
     */
    public function test_cascade_delete_foreign_key_constraint(): void
    {
        // Create a module
        $module = Module::create([
            'code_module' => 'CONST-004',
            'nom_module' => 'Cascade Test Module',
            'type_module' => 'STAGE',
            'credits' => 6.0,
        ]);

        // Create additional elements
        $element1 = ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'CASCADE-001',
            'nom_element' => 'Cascade Element 1',
            'type_element' => 'STAGE_ELEMENT',
            'coefficient' => 1.0,
        ]);

        $element2 = ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'CASCADE-002',
            'nom_element' => 'Cascade Element 2',
            'type_element' => 'COURS',
            'coefficient' => 0.5,
        ]);

        // Verify elements exist
        $this->assertDatabaseHas('elements_module', ['id_element' => $element1->id_element]);
        $this->assertDatabaseHas('elements_module', ['id_element' => $element2->id_element]);

        // Delete the module
        $moduleId = $module->id_module;
        $module->delete();

        // Verify all elements are cascade deleted
        $this->assertDatabaseMissing('elements_module', ['id_module' => $moduleId]);
        $this->assertDatabaseMissing('elements_module', ['id_element' => $element1->id_element]);
        $this->assertDatabaseMissing('elements_module', ['id_element' => $element2->id_element]);
    }


    /**
     * Test that self-referencing elements respect unique constraint
     */
    public function test_self_referencing_elements_respect_unique_constraint(): void
    {
        // Create a module (observer will create self-referencing element)
        $module = Module::create([
            'code_module' => 'CONST-005',
            'nom_module' => 'Self-Reference Constraint Test',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        $module->refresh();

        // Verify self-referencing element was created
        $this->assertCount(1, $module->elements);
        $selfRefElement = $module->elements->first();
        $this->assertEquals('CONST-005', $selfRefElement->code_element);

        // Attempt to create another element with the same code (should fail)
        $this->expectException(QueryException::class);
        
        ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'CONST-005', // Same as self-referencing element
            'nom_element' => 'Duplicate Self-Reference',
            'type_element' => 'COURS',
            'coefficient' => 1.0,
        ]);
    }

    /**
     * Test that foreign key constraint is properly configured with correct reference
     */
    public function test_foreign_key_references_correct_column(): void
    {
        // Create a module
        $module = Module::create([
            'code_module' => 'CONST-006',
            'nom_module' => 'Foreign Key Test',
            'type_module' => 'THESE',
            'credits' => 10.0,
        ]);

        // Create an element
        $element = ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'FK-TEST',
            'nom_element' => 'Foreign Key Element',
            'type_element' => 'AUTRE',
            'coefficient' => 1.0,
        ]);

        // Verify the foreign key relationship works
        $this->assertEquals($module->id_module, $element->id_module);
        
        // Verify we can navigate the relationship
        $retrievedModule = $element->module;
        $this->assertNotNull($retrievedModule);
        $this->assertEquals($module->id_module, $retrievedModule->id_module);
        $this->assertEquals('CONST-006', $retrievedModule->code_module);
    }

    /**
     * Test that multiple elements can exist for same module with different codes
     */
    public function test_multiple_elements_with_different_codes_allowed(): void
    {
        // Create a module
        $module = Module::create([
            'code_module' => 'CONST-007',
            'nom_module' => 'Multiple Elements Test',
            'type_module' => 'CONNAISSANCE',
            'credits' => 8.0,
        ]);

        // Create multiple elements with different codes
        $element1 = ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'MULTI-001',
            'nom_element' => 'Element 1',
            'type_element' => 'COURS',
            'coefficient' => 1.0,
        ]);

        $element2 = ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'MULTI-002',
            'nom_element' => 'Element 2',
            'type_element' => 'TP',
            'coefficient' => 0.5,
        ]);

        $element3 = ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'MULTI-003',
            'nom_element' => 'Element 3',
            'type_element' => 'PRE_CLINIQUE',
            'coefficient' => 0.75,
        ]);

        // Refresh and verify all elements exist
        $module->refresh();
        $this->assertGreaterThanOrEqual(4, $module->elements->count()); // 3 created + 1 self-referencing

        // Verify each element is in the database
        $this->assertDatabaseHas('elements_module', ['id_element' => $element1->id_element]);
        $this->assertDatabaseHas('elements_module', ['id_element' => $element2->id_element]);
        $this->assertDatabaseHas('elements_module', ['id_element' => $element3->id_element]);
    }
}
