<?php

namespace App\Services;

use App\Models\Module;
use App\Models\ElementModule;
use Illuminate\Database\Eloquent\Collection;

class ModuleService
{
    /**
     * Get all Modules that have no associated ElementModule records
     * 
     * @return \Illuminate\Database\Eloquent\Collection<Module>
     */
    public function getModulesWithoutElements(): Collection
    {
        return Module::doesntHave('elements')->get();
    }

    /**
     * Create a self-referencing ElementModule for a given Module
     * Inherits properties from the parent Module
     * 
     * @param Module $module
     * @return ElementModule
     */
    public function createSelfReferencingElement(Module $module): ElementModule
    {
        // Map type_module to type_element
        $typeMapping = [
            'CONNAISSANCE' => 'COURS',
            'HORIZONTAL' => 'COURS',
            'STAGE' => 'STAGE_ELEMENT',
            'THESE' => 'AUTRE',
        ];

        $typeElement = $typeMapping[$module->type_module] ?? 'AUTRE';

        // Cap coefficient at 99.99 (database limit for decimal(4,2))
        // For self-referencing elements, use 1.00 as default coefficient
        // since the module's credits represent the total, not individual element weight
        $coefficient = 1.00;

        return ElementModule::create([
            'id_module' => $module->id_module,
            'id_element_parent' => null,
            'code_element' => $module->code_module,
            'nom_element' => $module->nom_module,
            'type_element' => $typeElement,
            'coefficient' => $coefficient,
        ]);
    }

    /**
     * Determine if an ElementModule is self-referencing
     * Checks if code_element matches parent Module's code_module
     * AND nom_element matches parent Module's nom_module
     * 
     * @param ElementModule $element
     * @return bool
     */
    public function isSelfReferencingElement(ElementModule $element): bool
    {
        $module = $element->module;
        
        return $element->code_element === $module->code_module
            && $element->nom_element === $module->nom_module;
    }

    /**
     * Process a single Module to ensure it has at least one element
     * Creates self-referencing element if none exist
     * 
     * @param Module $module
     * @return bool True if element was created, false if skipped
     */
    public function ensureModuleHasElement(Module $module): bool
    {
        // Check if Module has any ElementModule records
        if ($module->elements()->exists()) {
            return false;
        }

        // Create self-referencing element if none exist
        $this->createSelfReferencingElement($module);
        
        return true;
    }
}
