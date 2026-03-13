<?php

namespace Tests\Unit;

use App\Models\ElementModule;
use App\Models\Module;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Validates: Requirements 4.3
 * 
 * Tests to verify Module-ElementModule relationship configuration
 */
class ModuleElementModuleRelationshipTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that Module has hasMany relationship with ElementModule
     */
    public function test_module_has_many_element_modules(): void
    {
        // Create a module (observer will create self-referencing element)
        $module = Module::create([
            'code_module' => 'TEST-001',
            'nom_module' => 'Test Module',
            'type_module' => 'CONNAISSANCE',
            'credits' => 3.0,
        ]);

        // Create additional elements for the module
        $element1 = ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'ELEM-001',
            'nom_element' => 'Element 1',
            'type_element' => 'COURS',
            'coefficient' => 1.0,
        ]);

        $element2 = ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'ELEM-002',
            'nom_element' => 'Element 2',
            'type_element' => 'TP',
            'coefficient' => 0.5,
        ]);

        // Refresh to get all elements
        $module->refresh();

        // Verify the relationship (3 elements: 1 self-referencing + 2 created)
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\HasMany::class, $module->elements());
        $this->assertCount(3, $module->elements);
        $this->assertTrue($module->elements->contains($element1));
        $this->assertTrue($module->elements->contains($element2));
    }

    /**
     * Test that ElementModule belongs to Module
     */
    public function test_element_module_belongs_to_module(): void
    {
        // Create a module
        $module = Module::create([
            'code_module' => 'TEST-002',
            'nom_module' => 'Test Module 2',
            'type_module' => 'HORIZONTAL',
            'credits' => 2.0,
        ]);

        // Create an element
        $element = ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'ELEM-003',
            'nom_element' => 'Element 3',
            'type_element' => 'COURS',
            'coefficient' => 1.0,
        ]);

        // Verify the relationship
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\BelongsTo::class, $element->module());
        $this->assertNotNull($element->module);
        $this->assertEquals($module->id_module, $element->module->id_module);
        $this->assertEquals('TEST-002', $element->module->code_module);
    }

    /**
     * Test cascade delete behavior - deleting module should delete its elements
     */
    public function test_cascade_delete_removes_elements_when_module_deleted(): void
    {
        // Create a module
        $module = Module::create([
            'code_module' => 'TEST-003',
            'nom_module' => 'Test Module 3',
            'type_module' => 'STAGE',
            'credits' => 5.0,
        ]);

        // Create elements for the module
        $element1 = ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'ELEM-004',
            'nom_element' => 'Element 4',
            'type_element' => 'STAGE_ELEMENT',
            'coefficient' => 1.0,
        ]);

        $element2 = ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'ELEM-005',
            'nom_element' => 'Element 5',
            'type_element' => 'COURS',
            'coefficient' => 0.5,
        ]);

        // Verify elements exist
        $this->assertDatabaseHas('elements_module', ['id_element' => $element1->id_element]);
        $this->assertDatabaseHas('elements_module', ['id_element' => $element2->id_element]);

        // Delete the module
        $module->delete();

        // Verify elements are also deleted (cascade)
        $this->assertDatabaseMissing('elements_module', ['id_element' => $element1->id_element]);
        $this->assertDatabaseMissing('elements_module', ['id_element' => $element2->id_element]);
    }

    /**
     * Test that relationship uses correct foreign keys
     */
    public function test_relationships_use_correct_foreign_keys(): void
    {
        $module = Module::create([
            'code_module' => 'TEST-004',
            'nom_module' => 'Test Module 4',
            'type_module' => 'THESE',
            'credits' => 10.0,
        ]);

        $element = ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'ELEM-006',
            'nom_element' => 'Element 6',
            'type_element' => 'AUTRE',
            'coefficient' => 1.0,
        ]);

        // Verify foreign key relationship
        $this->assertEquals($module->id_module, $element->id_module);
        
        // Verify we can access through relationship
        $retrievedModule = $element->module;
        $this->assertNotNull($retrievedModule);
        $this->assertEquals($module->id_module, $retrievedModule->id_module);
        
        // Refresh to get all elements (including self-referencing one)
        $module->refresh();
        
        // Verify reverse relationship (2 elements: 1 self-referencing + 1 created)
        $retrievedElements = $module->elements;
        $this->assertCount(2, $retrievedElements);
        $this->assertTrue($retrievedElements->contains('id_element', $element->id_element));
    }
}
