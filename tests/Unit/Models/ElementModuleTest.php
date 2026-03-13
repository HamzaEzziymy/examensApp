<?php

namespace Tests\Unit\Models;

use App\Models\Module;
use App\Models\ElementModule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ElementModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_isSelfReferencing_returns_true_when_element_is_self_referencing(): void
    {
        // Disable observer to test in isolation
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

        $this->assertTrue($element->isSelfReferencing());
    }

    public function test_isSelfReferencing_returns_false_when_element_is_not_self_referencing(): void
    {
        // Disable observer to test in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
        ]);

        $element = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'DIFF-202',
            'nom_element' => 'Different Element',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $this->assertFalse($element->isSelfReferencing());
    }

    public function test_isSelfReferencing_returns_false_when_only_code_matches(): void
    {
        // Disable observer to test in isolation
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

        $this->assertFalse($element->isSelfReferencing());
    }

    public function test_isSelfReferencing_returns_false_when_only_name_matches(): void
    {
        // Disable observer to test in isolation
        Module::unsetEventDispatcher();
        
        $module = Module::factory()->create([
            'code_module' => 'TEST-101',
            'nom_module' => 'Test Module',
        ]);

        $element = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'DIFF-202',
            'nom_element' => 'Test Module',
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        $this->assertFalse($element->isSelfReferencing());
    }
}
