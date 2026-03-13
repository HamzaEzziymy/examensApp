<?php

namespace Tests\Feature;

use App\Models\ElementModule;
use App\Models\Module;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ElementModuleValidationTest extends TestCase
{
    use RefreshDatabase;

    protected Module $module;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create a test module
        $this->module = Module::create([
            'code_module' => 'TEST-001',
            'nom_module' => 'Test Module',
            'type_module' => 'CONNAISSANCE',
            'credits' => 6
        ]);
    }

    public function test_coefficient_cannot_exceed_maximum_value_on_create(): void
    {
        $response = $this->post(route('academique.elements-module.store'), [
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-001',
            'nom_element' => 'Test Element',
            'type_element' => 'COURS',
            'coefficient' => 100.00, // Exceeds max of 99.99
        ]);

        $response->assertSessionHasErrors('coefficient');
        
        // Verify element was not created
        $this->assertEquals(1, ElementModule::count()); // Only the auto-created self-referencing element
    }

    public function test_coefficient_accepts_maximum_valid_value_on_create(): void
    {
        // First delete the auto-created element
        $this->module->elements()->delete();

        $response = $this->post(route('academique.elements-module.store'), [
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-001',
            'nom_element' => 'Test Element',
            'type_element' => 'COURS',
            'coefficient' => 99.99, // Maximum valid value
        ]);

        $response->assertRedirect(route('academique.modules.index'));
        
        // Verify element was created
        $this->assertDatabaseHas('elements_module', [
            'code_element' => 'ELEM-001',
            'coefficient' => 99.99,
        ]);
    }

    public function test_coefficient_cannot_be_negative_on_create(): void
    {
        $response = $this->post(route('academique.elements-module.store'), [
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-001',
            'nom_element' => 'Test Element',
            'type_element' => 'COURS',
            'coefficient' => -5.00,
        ]);

        $response->assertSessionHasErrors('coefficient');
    }

    public function test_coefficient_cannot_exceed_maximum_value_on_update(): void
    {
        // Create an element
        $element = ElementModule::create([
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-001',
            'nom_element' => 'Test Element',
            'type_element' => 'COURS',
            'coefficient' => 5.00,
        ]);

        $response = $this->put(route('academique.elements-module.update', $element->id_element), [
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-001',
            'nom_element' => 'Test Element',
            'type_element' => 'COURS',
            'coefficient' => 150.00, // Exceeds max
        ]);

        $response->assertSessionHasErrors('coefficient');
        
        // Verify coefficient was not updated
        $this->assertEquals(5.00, $element->fresh()->coefficient);
    }

    public function test_coefficient_accepts_valid_decimal_values(): void
    {
        // First delete the auto-created element
        $this->module->elements()->delete();

        $validCoefficients = [0.01, 1.00, 10.50, 50.00, 99.99];

        foreach ($validCoefficients as $index => $coefficient) {
            $response = $this->post(route('academique.elements-module.store'), [
                'id_module' => $this->module->id_module,
                'code_element' => 'ELEM-' . str_pad($index, 3, '0', STR_PAD_LEFT),
                'nom_element' => 'Test Element ' . $index,
                'type_element' => 'COURS',
                'coefficient' => $coefficient,
            ]);

            $response->assertRedirect(route('academique.modules.index'));
            
            $this->assertDatabaseHas('elements_module', [
                'code_element' => 'ELEM-' . str_pad($index, 3, '0', STR_PAD_LEFT),
                'coefficient' => $coefficient,
            ]);
        }
    }

    public function test_coefficient_validation_message_is_clear(): void
    {
        $response = $this->post(route('academique.elements-module.store'), [
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-001',
            'nom_element' => 'Test Element',
            'type_element' => 'COURS',
            'coefficient' => 200.00,
        ]);

        $response->assertSessionHasErrors('coefficient');
        
        // Verify the error message mentions the maximum value
        $errors = session('errors');
        $this->assertNotNull($errors);
        $coefficientErrors = $errors->get('coefficient');
        $this->assertNotEmpty($coefficientErrors);
    }
}
