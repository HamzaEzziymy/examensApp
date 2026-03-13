<?php

namespace Tests\Feature;

use App\Models\ElementModule;
use App\Models\Module;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ElementModuleAutoDeleteTest extends TestCase
{
    use RefreshDatabase;

    protected Module $module;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create a test module (will auto-create self-referencing element)
        $this->module = Module::create([
            'code_module' => 'TEST-001',
            'nom_module' => 'Test Module',
            'type_module' => 'CONNAISSANCE',
            'credits' => 6
        ]);
    }

    public function test_adding_first_custom_element_deletes_self_referencing_element(): void
    {
        // Verify module has 1 self-referencing element
        $this->assertEquals(1, $this->module->fresh()->elements()->count());
        
        $selfReferencingElement = $this->module->fresh()->elements()->first();
        $this->assertEquals($this->module->code_module, $selfReferencingElement->code_element);
        $this->assertEquals($this->module->nom_module, $selfReferencingElement->nom_element);

        // Add a custom element
        $response = $this->post(route('academique.elements-module.store'), [
            'id_module' => $this->module->id_module,
            'code_element' => 'CUSTOM-001',
            'nom_element' => 'Custom Element',
            'type_element' => 'COURS',
            'coefficient' => 3.00,
        ]);

        $response->assertRedirect(route('academique.modules.index'));

        // Verify module now has only 1 element (the custom one)
        $this->assertEquals(1, $this->module->fresh()->elements()->count());

        // Verify the element is the custom one, not the self-referencing one
        $element = $this->module->fresh()->elements()->first();
        $this->assertEquals('CUSTOM-001', $element->code_element);
        $this->assertEquals('Custom Element', $element->nom_element);
        $this->assertEquals(3.00, $element->coefficient);

        // Verify the self-referencing element was deleted
        $this->assertDatabaseMissing('elements_module', [
            'id_element' => $selfReferencingElement->id_element,
        ]);
    }

    public function test_adding_second_element_does_not_delete_existing_custom_elements(): void
    {
        // Delete the auto-created self-referencing element
        $this->module->elements()->delete();

        // Add first custom element
        $element1 = ElementModule::create([
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-001',
            'nom_element' => 'Element 1',
            'type_element' => 'COURS',
            'coefficient' => 2.00,
        ]);

        // Verify module has 1 element
        $this->assertEquals(1, $this->module->fresh()->elements()->count());

        // Add second custom element
        $response = $this->post(route('academique.elements-module.store'), [
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-002',
            'nom_element' => 'Element 2',
            'type_element' => 'TP',
            'coefficient' => 1.00,
        ]);

        $response->assertRedirect(route('academique.modules.index'));

        // Verify module now has 2 elements
        $this->assertEquals(2, $this->module->fresh()->elements()->count());

        // Verify both elements exist
        $this->assertDatabaseHas('elements_module', [
            'id_element' => $element1->id_element,
            'code_element' => 'ELEM-001',
        ]);

        $this->assertDatabaseHas('elements_module', [
            'code_element' => 'ELEM-002',
        ]);
    }

    public function test_adding_element_to_module_with_multiple_elements_does_not_delete_anything(): void
    {
        // Delete the auto-created self-referencing element
        $this->module->elements()->delete();

        // Add two custom elements
        $element1 = ElementModule::create([
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-001',
            'nom_element' => 'Element 1',
            'type_element' => 'COURS',
            'coefficient' => 2.00,
        ]);

        $element2 = ElementModule::create([
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-002',
            'nom_element' => 'Element 2',
            'type_element' => 'TP',
            'coefficient' => 1.00,
        ]);

        // Verify module has 2 elements
        $this->assertEquals(2, $this->module->fresh()->elements()->count());

        // Add third element
        $response = $this->post(route('academique.elements-module.store'), [
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-003',
            'nom_element' => 'Element 3',
            'type_element' => 'PRE_CLINIQUE',
            'coefficient' => 1.50,
        ]);

        $response->assertRedirect(route('academique.modules.index'));

        // Verify module now has 3 elements
        $this->assertEquals(3, $this->module->fresh()->elements()->count());

        // Verify all three elements exist
        $this->assertDatabaseHas('elements_module', ['id_element' => $element1->id_element]);
        $this->assertDatabaseHas('elements_module', ['id_element' => $element2->id_element]);
        $this->assertDatabaseHas('elements_module', ['code_element' => 'ELEM-003']);
    }

    public function test_adding_element_when_only_non_self_referencing_element_exists_keeps_both(): void
    {
        // Delete the auto-created self-referencing element
        $this->module->elements()->delete();

        // Manually create a non-self-referencing element with different code/name
        $element1 = ElementModule::create([
            'id_module' => $this->module->id_module,
            'code_element' => 'DIFFERENT-CODE',
            'nom_element' => 'Different Name',
            'type_element' => 'COURS',
            'coefficient' => 2.00,
        ]);

        // Verify module has 1 element
        $this->assertEquals(1, $this->module->fresh()->elements()->count());

        // Add second element
        $response = $this->post(route('academique.elements-module.store'), [
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-002',
            'nom_element' => 'Element 2',
            'type_element' => 'TP',
            'coefficient' => 1.00,
        ]);

        $response->assertRedirect(route('academique.modules.index'));

        // Verify module now has 2 elements (first one was NOT deleted because it's not self-referencing)
        $this->assertEquals(2, $this->module->fresh()->elements()->count());

        // Verify both elements exist
        $this->assertDatabaseHas('elements_module', ['id_element' => $element1->id_element]);
        $this->assertDatabaseHas('elements_module', ['code_element' => 'ELEM-002']);
    }
}
