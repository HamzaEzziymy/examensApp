<?php

namespace Tests\Unit\Models;

use App\Models\Module;
use App\Models\ElementModule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_getSelfReferencingElement_returns_self_referencing_element(): void
    {
        // Disable observer to test in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
        ]);

        // Create a self-referencing element
        $selfReferencingElement = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'TEST-101',
            'nom_element' => 'Test Module',
        ]);

        // Create a non-self-referencing element
        ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'OTHER-202',
            'nom_element' => 'Other Element',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $result = $module->fresh()->getSelfReferencingElement();

        $this->assertNotNull($result);
        $this->assertEquals($selfReferencingElement->id_element, $result->id_element);
    }

    public function test_getSelfReferencingElement_returns_null_when_no_self_referencing_element_exists(): void
    {
        // Disable observer to test in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
        ]);

        // Create only non-self-referencing elements
        ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'OTHER-202',
            'nom_element' => 'Other Element',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $result = $module->fresh()->getSelfReferencingElement();

        $this->assertNull($result);
    }

    public function test_getSelfReferencingElement_returns_null_when_no_elements_exist(): void
    {
        // Disable observer to test in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create();

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $result = $module->getSelfReferencingElement();

        $this->assertNull($result);
    }

    public function test_hasSelfReferencingElement_returns_true_when_self_referencing_element_exists(): void
    {
        // Disable observer to test in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
        ]);

        // Create a self-referencing element
        ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'TEST-101',
            'nom_element' => 'Test Module',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $result = $module->fresh()->hasSelfReferencingElement();

        $this->assertTrue($result);
    }

    public function test_hasSelfReferencingElement_returns_false_when_no_self_referencing_element_exists(): void
    {
        // Disable observer to test in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
        ]);

        // Create only non-self-referencing elements
        ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'OTHER-202',
            'nom_element' => 'Other Element',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $result = $module->fresh()->hasSelfReferencingElement();

        $this->assertFalse($result);
    }

    public function test_hasSelfReferencingElement_returns_false_when_no_elements_exist(): void
    {
        // Disable observer to test in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create();

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $result = $module->hasSelfReferencingElement();

        $this->assertFalse($result);
    }

    public function test_getSelfReferencingElement_uses_module_service_for_identification(): void
    {
        // Disable observer to test in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
        ]);

        // Create element with matching code but different name (not self-referencing)
        ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'TEST-101',
            'nom_element' => 'Different Name',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $result = $module->fresh()->getSelfReferencingElement();

        // Should return null because ModuleService requires both code AND name to match
        $this->assertNull($result);
    }
}
