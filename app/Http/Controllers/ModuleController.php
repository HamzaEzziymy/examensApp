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
        $modules = Module::with('elements')
            ->orderBy('nom_module')
            ->get();

         return Inertia::render('Academique/Modules/Index', [
            'modules' => $modules,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code_module' => ['required', 'string', 'max:20', 'unique:modules,code_module'],
            'nom_module'  => ['required', 'string', 'max:255'],
            'type_module' => ['required', 'in:CONNAISSANCE,HORIZONTAL,STAGE,THESE'],
            'credits'     => ['required', 'numeric', 'min:0'],
        ]);

        $module = Module::create($validated);

        return Redirect()->route('academique.modules.index');
    }

    public function show($id)
    {
        $module = Module::with('elements')->findOrFail($id);

        return Inertia::render('Academique/Modules/Show', [
            'module' => $module,
        ]);
    }

    public function update(Request $request, $id)
    {
        $module= Module::findorfail($id);
        $validated = $request->validate([
            'code_module' => [
                'required',
                'string',
                'max:20',
                Rule::unique('modules', 'code_module')->ignore($module->id_module, 'id_module'),
            ],
            'nom_module'  => ['required', 'string', 'max:255'],
            'type_module' => ['required', 'in:CONNAISSANCE,HORIZONTAL,STAGE,THESE'],
            'credits'     => ['required', 'numeric', 'min:0'],
        ]);

        $module->update($validated);

     return Redirect()->route('academique.modules.index');
    }

    public function destroy($id)
    {
        $module= Module::findorfail($id);
        $module->delete();

       return Redirect()->route('academique.modules.index');
    }
}
