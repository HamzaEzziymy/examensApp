<?php

namespace Tests\Feature;

use App\Models\ElementModule;
use App\Models\Module;
use App\Services\ModuleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ElementModuleControllerTest extends TestCase
{
    use RefreshDatabase;

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

    /** @test */
    public function it_creates_self_referencing_element_when_last_element_is_deleted()
    {
        // First, delete the auto-created self-referencing element
        $autoElement = $this->module->fresh()->elements()->first();
        $autoElement->delete();

        // Create a custom element (not self-referencing)
        $element = ElementModule::create([
            'id_module' => $this->module->id_module,
            'code_element' => 'CUSTOM-001',
            'nom_element' => 'Custom Element',
            'type_element' => 'COURS',
            'coefficient' => 3
        ]);

        // Verify module has 1 element
        $this->assertEquals(1, $this->module->fresh()->elements()->count());

        // Delete the element
        $response = $this->delete(route('academique.elements-module.destroy', $element->id_element));

        // Verify redirect
        $response->assertRedirect(route('academique.modules.index'));

        // Verify module still has 1 element (self-referencing)
        $this->assertEquals(1, $this->module->fresh()->elements()->count());

        // Verify the new element is self-referencing
        $newElement = $this->module->fresh()->elements()->first();
        $this->assertEquals($this->module->code_module, $newElement->code_element);
        $this->assertEquals($this->module->nom_module, $newElement->nom_element);
    }

    /** @test */
    public function it_does_not_create_duplicate_when_deleting_non_last_element()
    {
        // First, delete the auto-created self-referencing element
        $autoElement = $this->module->fresh()->elements()->first();
        $autoElement->delete();

        // Create two elements
        $element1 = ElementModule::create([
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-001',
            'nom_element' => 'Element 1',
            'type_element' => 'COURS',
            'coefficient' => 2
        ]);

        $element2 = ElementModule::create([
            'id_module' => $this->module->id_module,
            'code_element' => 'ELEM-002',
            'nom_element' => 'Element 2',
            'type_element' => 'TP',
            'coefficient' => 1
        ]);

        // Verify module has 2 elements
        $this->assertEquals(2, $this->module->fresh()->elements()->count());

        // Delete one element
        $response = $this->delete(route('academique.elements-module.destroy', $element1->id_element));

        // Verify module still has 1 element (not 2)
        $this->assertEquals(1, $this->module->fresh()->elements()->count());

        // Verify the remaining element is element2
        $remainingElement = $this->module->fresh()->elements()->first();
        $this->assertEquals($element2->id_element, $remainingElement->id_element);
    }

    /** @test */
    public function it_replaces_self_referencing_element_when_deleted()
    {
        // Get the auto-created self-referencing element
        $selfReferencingElement = $this->module->fresh()->elements()->first();
        
        $this->assertNotNull($selfReferencingElement);
        $this->assertEquals($this->module->code_module, $selfReferencingElement->code_element);

        // Delete it
        $response = $this->delete(route('academique.elements-module.destroy', $selfReferencingElement->id_element));

        // Verify module still has 1 element
        $this->assertEquals(1, $this->module->fresh()->elements()->count());

        // Verify a new self-referencing element was created
        $newElement = $this->module->fresh()->elements()->first();
        $this->assertNotEquals($selfReferencingElement->id_element, $newElement->id_element);
        $this->assertEquals($this->module->code_module, $newElement->code_element);
        $this->assertEquals($this->module->nom_module, $newElement->nom_element);
    }
}
