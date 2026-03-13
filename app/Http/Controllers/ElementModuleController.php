<?php

namespace App\Http\Controllers;

use App\Models\ElementModule;
use App\Models\Module;
use App\Services\ModuleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
class ElementModuleController extends Controller
{
    public function __construct(private ModuleService $moduleService)
    {
    }
    public function index()
    {
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_module'        => ['required', 'exists:modules,id_module'],
            'id_element_parent'=> ['nullable', 'exists:elements_module,id_element'],
            'code_element'     => ['required', 'string', 'max:20','unique:elements_module,code_element'],
            'nom_element'      => ['required', 'string', 'max:255'],
            'type_element'     => ['required', 'in:COURS,TP,PRE_CLINIQUE,STAGE_ELEMENT,AUTRE'],
            'coefficient'      => ['required', 'numeric', 'min:0', 'max:99.99'],
        ]);

        // Get the module
        $module = Module::findOrFail($validated['id_module']);

        // Check if the module has only one element and if it's self-referencing
        $elements = $module->elements;
        if ($elements->count() === 1) {
            $existingElement = $elements->first();
            if ($this->moduleService->isSelfReferencingElement($existingElement)) {
                // Delete the self-referencing element before creating the new one
                $existingElement->delete();
            }
        }

        $element = ElementModule::create($validated);

        return Redirect()->route('academique.modules.index');
    }

    public function show(ElementModule $elements_module)
    {
        $elements_module->load('module');

          return Inertia::render('Academique/ElementsModule/Show', [
            'element' => $elements_module,
        ]);
    }

    public function update(Request $request, ElementModule $elements_module)
    {
        $validated = $request->validate([
            'id_module'        => ['required', 'exists:modules,id_module'],
            'id_element_parent'=> ['nullable', 'exists:elements_module,id_element'],
            // 'unique' rule to ignore current element
            'code_element'     => ['required', 'string', 'max:20', 'unique:elements_module,code_element,' . $elements_module->id_element . ',id_element'],
            'nom_element'      => ['required', 'string', 'max:255'],
            'type_element'     => ['required', 'in:COURS,TP,PRE_CLINIQUE,STAGE_ELEMENT,AUTRE'],
            'coefficient'      => ['required', 'numeric', 'min:0', 'max:99.99'],
        ]);

        $elements_module->update($validated);

        return Redirect()->route('academique.modules.index');
    }

    public function destroy(ElementModule $elements_module)
    {
        $module = $elements_module->module;
        $elements_module->delete();

        // Check if module now has zero elements and create self-referencing element if needed
        $this->moduleService->ensureModuleHasElement($module);

        return Redirect()->route('academique.modules.index');
    }
}
