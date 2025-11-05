<?php

namespace App\Http\Controllers;

use App\Models\Module;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
class ModuleController extends Controller
{
    public function index()
    {
        $modules = Module::with([
                'niveau:id_niveau,nom_niveau',
                'semestre:id_semestre,nom_semestre',
            ])
            ->withCount('elements')
            ->orderBy('nom_module')
            ->get();

         return Inertia::render('Academique/Modules/Index', [
            'modules' => $modules,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code_module'        => ['required', 'string', 'max:20', 'unique:modules,code_module'],
            'nom_module'         => ['required', 'string', 'max:100'],
            'abreviation_module' => ['required', 'string', 'max:100'],
            'nature'             => ['required', 'string', 'max:100'],
            'quadrimestre'       => ['required', 'integer', 'min:1'],
            'seuil_validation'   => ['required', 'numeric', 'between:0,20'],
            'coefficient_module' => ['required', 'numeric', 'min:0'],
            'credits_requis'     => ['nullable', 'integer', 'min:0'],
            'description'        => ['nullable', 'string'],
            'id_niveau'          => ['nullable', 'exists:niveaux,id_niveau'],
            'id_semestre'        => ['nullable', 'exists:semestres,id_semestre'],
        ]);

        $module = Module::create($validated);

         return Redirect()->route('academique.modules.index')
            ->with('success', 'Module créé.');
    }

    public function show($id)
    {
        $module= Module::findorfail($id);
        $module->load(['niveau', 'semestre', 'elements']);

        return Inertia::render('Academique/Modules/Show', [
            'module' => $module,
        ]);
    }

    public function update(Request $request, $id)
    {
        $module= Module::findorfail($id);
        $validated = $request->validate([
            'code_module'        => [
                'required',
                'string',
                'max:20',
                Rule::unique('modules', 'code_module')->ignore($module->id_module, 'id_module'),
            ],
            'nom_module'         => ['required', 'string', 'max:100'],
            'abreviation_module' => ['required', 'string', 'max:100'],
            'nature'             => ['required', 'string', 'max:100'],
            'quadrimestre'       => ['required', 'integer', 'min:1'],
            'seuil_validation'   => ['required', 'numeric', 'between:0,20'],
            'coefficient_module' => ['required', 'numeric', 'min:0'],
            'credits_requis'     => ['nullable', 'integer', 'min:0'],
            'description'        => ['nullable', 'string'],
            'id_niveau'          => ['nullable', 'exists:niveaux,id_niveau'],
            'id_semestre'        => ['nullable', 'exists:semestres,id_semestre'],
        ]);

        $module->update($validated);

     return Redirect()->route('academique.modules.index')
            ->with('success', 'Module mis à jour.');
    }

    public function destroy($id)
    {
        $module= Module::findorfail($id);
        $module->delete();

       return Redirect()->route('academique.modules.index')
            ->with('success', 'Module supprimé.');
    }
}