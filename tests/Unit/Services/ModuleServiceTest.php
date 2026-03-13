<?php

namespace Tests\Unit\Services;

use App\Models\Module;
use App\Models\ElementModule;
use App\Services\ModuleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModuleServiceTest extends TestCase
{
    use RefreshDatabase;

    private ModuleService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ModuleService();
    }

    public function test_getModulesWithoutElements_returns_modules_without_elements(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        // Create modules without elements
        $moduleWithoutElements1 = Module::factory()->create();
        $moduleWithoutElements2 = Module::factory()->create();
        
        // Create module with elements
        $moduleWithElements = Module::factory()->create();
        ElementModule::factory()->create(['id_module' => $moduleWithElements->id_module]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $result = $this->service->getModulesWithoutElements();

        $this->assertCount(2, $result);
        $this->assertTrue($result->contains($moduleWithoutElements1));
        $this->assertTrue($result->contains($moduleWithoutElements2));
        $this->assertFalse($result->contains($moduleWithElements));
    }

    public function test_getModulesWithoutElements_returns_empty_collection_when_all_modules_have_elements(): void
    {
        // Create modules with elements
        $module1 = Module::factory()->create();
        ElementModule::factory()->create(['id_module' => $module1->id_module]);
        
        $module2 = Module::factory()->create();
        ElementModule::factory()->create(['id_module' => $module2->id_module]);

        $result = $this->service->getModulesWithoutElements();

        $this->assertCount(0, $result);
    }

    public function test_getModulesWithoutElements_returns_empty_collection_when_no_modules_exist(): void
    {
        $result = $this->service->getModulesWithoutElements();

        $this->assertCount(0, $result);
    }

    public function test_isSelfReferencingElement_returns_true_when_both_code_and_name_match(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
        ]);

        $element = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'TEST-101',
            'nom_element' => 'Test Module',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $result = $this->service->isSelfReferencingElement($element);

        $this->assertTrue($result);
    }

    public function test_isSelfReferencingElement_returns_false_when_code_matches_but_name_differs(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
        ]);

        $element = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'TEST-101',
            'nom_element' => 'Different Name',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $result = $this->service->isSelfReferencingElement($element);

        $this->assertFalse($result);
    }

    public function test_isSelfReferencingElement_returns_false_when_name_matches_but_code_differs(): void
    {
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
        ]);

        $element = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'DIFF-202',
            'nom_element' => 'Test Module',
        ]);

        $result = $this->service->isSelfReferencingElement($element);

        $this->assertFalse($result);
    }

    public function test_isSelfReferencingElement_returns_false_when_both_code_and_name_differ(): void
    {
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
        ]);

        $element = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'DIFF-202',
            'nom_element' => 'Different Name',
        ]);

        $result = $this->service->isSelfReferencingElement($element);

        $this->assertFalse($result);
    }

    public function test_ensureModuleHasElement_creates_element_when_none_exist(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $result = $this->service->ensureModuleHasElement($module);

        $this->assertTrue($result);
        $this->assertCount(1, $module->elements);
        
        $element = $module->elements->first();
        $this->assertEquals('TEST-101', $element->code_element);
        $this->assertEquals('Test Module', $element->nom_element);
        $this->assertEquals('COURS', $element->type_element);
        $this->assertEquals(1.0, $element->coefficient); // Self-referencing elements use coefficient 1.0
    }

    public function test_ensureModuleHasElement_returns_false_when_elements_exist(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create();
        ElementModule::factory()->create(['id_module' => $module->id_module]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $result = $this->service->ensureModuleHasElement($module);

        $this->assertFalse($result);
        $this->assertCount(1, $module->elements);
    }

    public function test_ensureModuleHasElement_is_idempotent(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        // First call should create element
        $result1 = $this->service->ensureModuleHasElement($module);
        $this->assertTrue($result1);
        $this->assertCount(1, $module->fresh()->elements);

        // Second call should skip creation
        $result2 = $this->service->ensureModuleHasElement($module->fresh());
        $this->assertFalse($result2);
        $this->assertCount(1, $module->fresh()->elements);
    }

    public function test_createSelfReferencingElement_inherits_code_from_module(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'ANAT-101',
            'nom_module' => 'Anatomy',
            'type_module' => 'CONNAISSANCE',
            'credits' => 6.0,
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $element = $this->service->createSelfReferencingElement($module);

        $this->assertEquals('ANAT-101', $element->code_element);
    }

    public function test_createSelfReferencingElement_inherits_name_from_module(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'ANAT-101',
            'nom_module' => 'Anatomy Module',
            'type_module' => 'CONNAISSANCE',
            'credits' => 6.0,
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $element = $this->service->createSelfReferencingElement($module);

        $this->assertEquals('Anatomy Module', $element->nom_element);
    }

    public function test_createSelfReferencingElement_uses_default_coefficient(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'ANAT-101',
            'nom_module' => 'Anatomy',
            'type_module' => 'CONNAISSANCE',
            'credits' => 7.5,
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $element = $this->service->createSelfReferencingElement($module);

        $this->assertEquals(1.0, $element->coefficient); // Self-referencing elements use coefficient 1.0
    }

    public function test_createSelfReferencingElement_sets_id_module_correctly(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'ANAT-101',
            'nom_module' => 'Anatomy',
            'type_module' => 'CONNAISSANCE',
            'credits' => 6.0,
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $element = $this->service->createSelfReferencingElement($module);

        $this->assertEquals($module->id_module, $element->id_module);
    }

    public function test_createSelfReferencingElement_sets_id_element_parent_to_null(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'ANAT-101',
            'nom_module' => 'Anatomy',
            'type_module' => 'CONNAISSANCE',
            'credits' => 6.0,
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $element = $this->service->createSelfReferencingElement($module);

        $this->assertNull($element->id_element_parent);
    }

    public function test_createSelfReferencingElement_maps_connaissance_to_cours(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'type_module' => 'CONNAISSANCE',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $element = $this->service->createSelfReferencingElement($module);

        $this->assertEquals('COURS', $element->type_element);
    }

    public function test_createSelfReferencingElement_maps_horizontal_to_cours(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'type_module' => 'HORIZONTAL',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $element = $this->service->createSelfReferencingElement($module);

        $this->assertEquals('COURS', $element->type_element);
    }

    public function test_createSelfReferencingElement_maps_stage_to_stage_element(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'type_module' => 'STAGE',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $element = $this->service->createSelfReferencingElement($module);

        $this->assertEquals('STAGE_ELEMENT', $element->type_element);
    }

    public function test_createSelfReferencingElement_maps_these_to_autre(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'type_module' => 'THESE',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $element = $this->service->createSelfReferencingElement($module);

        $this->assertEquals('AUTRE', $element->type_element);
    }

    public function test_createSelfReferencingElement_persists_to_database(): void
    {
        // Disable observer to test the service in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'ANAT-101',
            'nom_module' => 'Anatomy',
            'type_module' => 'CONNAISSANCE',
            'credits' => 6.0,
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $element = $this->service->createSelfReferencingElement($module);

        $this->assertDatabaseHas('elements_module', [
            'id_element' => $element->id_element,
            'id_module' => $module->id_module,
            'code_element' => 'ANAT-101',
            'nom_element' => 'Anatomy',
            'type_element' => 'COURS',
            'coefficient' => 1.0, // Self-referencing elements use coefficient 1.0
        ]);
    }
}
