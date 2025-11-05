<?php

namespace App\Http\Controllers;

use App\Models\ElementModule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
class ElementModuleController extends Controller
{
    public function index()
    {
        $elements = ElementModule::with('module:id_module,nom_module')
            ->orderBy('nom_element')
            ->get();

       return Inertia::render('Academique/ElementsModule/Index', [
            'elements' => $elements,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_module'           => ['required', 'exists:modules,id_module'],
            'type_element'        => ['nullable', 'string', 'max:50'],
            'nom_element'         => ['required', 'string', 'max:100'],
            'coefficient_element' => ['required', 'numeric', 'min:0'],
            'seuil_validation'    => ['required', 'numeric', 'between:0,20'],
            'est_obligatoire'     => ['sometimes', 'boolean'],
        ]);

        $element = ElementModule::create($validated);

        return Redirect()->route('academique.elements-module.index')
            ->with('success', 'Élément de module créé.');
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
            'id_module'           => ['required', 'exists:modules,id_module'],
            'type_element'        => ['nullable', 'string', 'max:50'],
            'nom_element'         => ['required', 'string', 'max:100'],
            'coefficient_element' => ['required', 'numeric', 'min:0'],
            'seuil_validation'    => ['required', 'numeric', 'between:0,20'],
            'est_obligatoire'     => ['sometimes', 'boolean'],
        ]);

        $elements_module->update($validated);

        return Redirect()->route('academique.elements-module.index')
            ->with('success', 'Élément de module mis à jour.');
    }

    public function destroy(ElementModule $elements_module)
    {
        $elements_module->delete();

        return Redirect()->route('academique.elements-module.index')
            ->with('success', 'Élément de module supprimé.');
    }
}