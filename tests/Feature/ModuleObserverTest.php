<?php

namespace Tests\Feature;

use App\Models\Module;
use App\Models\ElementModule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ModuleObserverTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_module_without_elements_triggers_self_referencing_element_creation(): void
    {
        // Create a module without explicitly creating elements
        $module = Module::create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        // Refresh to get the latest data including relationships
        $module->refresh();

        // Assert that a self-referencing element was automatically created
        $this->assertCount(1, $module->elements);
        
        $element = $module->elements->first();
        $this->assertEquals('TEST-101', $element->code_element);
        $this->assertEquals('Test Module', $element->nom_element);
        $this->assertEquals('COURS', $element->type_element);
        $this->assertEquals(1.0, $element->coefficient); // Self-referencing elements use coefficient 1.0
        $this->assertNull($element->id_element_parent);
    }

    public function test_observer_does_not_create_duplicate_when_module_already_has_elements(): void
    {
        // This test verifies Requirement 4.1: When a Module has one or more Element_Module records,
        // the system SHALL NOT create a Self_Referencing_Element
        
        // First, let's disable the observer temporarily to create a module with elements
        Module::unsetEventDispatcher();
        
        $module = Module::create([
            'code_module' => 'TEST-102',
            'nom_module' => 'Test Module with Elements',
            'type_module' => 'CONNAISSANCE',
            'credits' => 6.0,
        ]);

        // Create an element manually
        ElementModule::create([
            'id_module' => $module->id_module,
            'code_element' => 'ELEM-001',
            'nom_element' => 'Custom Element',
            'type_element' => 'COURS',
            'coefficient' => 3.0,
        ]);

        // Re-enable the observer
        Module::setEventDispatcher($this->app['events']);

        // Refresh and verify we have exactly 1 element
        $module->refresh();
        $this->assertCount(1, $module->elements);
        
        $element = $module->elements->first();
        $this->assertEquals('ELEM-001', $element->code_element);
        $this->assertEquals('Custom Element', $element->nom_element);
        
        // Now test that ensureModuleHasElement doesn't create another element
        $service = app(\App\Services\ModuleService::class);
        $result = $service->ensureModuleHasElement($module);
        
        // Should return false because element already exists
        $this->assertFalse($result);
        
        // Verify still only 1 element
        $module->refresh();
        $this->assertCount(1, $module->elements);
    }

    public function test_transaction_rollback_prevents_self_referencing_element_creation(): void
    {
        try {
            DB::transaction(function () {
                $module = Module::create([
                    'code_module' => 'TEST-103',
                    'nom_module' => 'Test Module Rollback',
                    'type_module' => 'CONNAISSANCE',
                    'credits' => 4.0,
                ]);

                // Force a rollback by throwing an exception
                throw new \Exception('Simulated transaction failure');
            });
        } catch (\Exception $e) {
            // Expected exception
        }

        // Assert that neither the module nor the element were created
        $this->assertDatabaseMissing('modules', [
            'code_module' => 'TEST-103',
        ]);

        $this->assertDatabaseMissing('elements_module', [
            'code_element' => 'TEST-103',
        ]);
    }

    public function test_observer_works_with_different_module_types(): void
    {
        $testCases = [
            ['type_module' => 'CONNAISSANCE', 'expected_type' => 'COURS'],
            ['type_module' => 'HORIZONTAL', 'expected_type' => 'COURS'],
            ['type_module' => 'STAGE', 'expected_type' => 'STAGE_ELEMENT'],
            ['type_module' => 'THESE', 'expected_type' => 'AUTRE'],
        ];

        foreach ($testCases as $index => $testCase) {
            $module = Module::create([
                'code_module' => "TEST-{$index}",
                'nom_module' => "Test Module {$index}",
                'type_module' => $testCase['type_module'],
                'credits' => 5.0,
            ]);

            $module->refresh();

            $this->assertCount(1, $module->elements);
            $element = $module->elements->first();
            $this->assertEquals($testCase['expected_type'], $element->type_element);
        }
    }

    public function test_observer_creates_element_with_correct_module_reference(): void
    {
        $module = Module::create([
            'code_module' => 'TEST-104',
            'nom_module' => 'Test Module Reference',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        $module->refresh();

        $element = $module->elements->first();
        $this->assertEquals($module->id_module, $element->id_module);
        
        // Verify the relationship works both ways
        $this->assertTrue($element->module->is($module));
    }

    public function test_observer_integration_with_database_constraints(): void
    {
        // Test that the observer respects database constraints
        // Create a module with a unique code
        $module = Module::create([
            'code_module' => 'UNIQUE-101',
            'nom_module' => 'Unique Module',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        $module->refresh();

        // Verify the element was created and persisted
        $this->assertDatabaseHas('elements_module', [
            'id_module' => $module->id_module,
            'code_element' => 'UNIQUE-101',
            'nom_element' => 'Unique Module',
            'type_element' => 'COURS',
            'coefficient' => 1.0, // Self-referencing elements use coefficient 1.0
        ]);

        // Verify the unique constraint on [id_module, code_element] is respected
        $elementCount = ElementModule::where('id_module', $module->id_module)
            ->where('code_element', 'UNIQUE-101')
            ->count();
        
        $this->assertEquals(1, $elementCount);
    }
}
