<?php

namespace App\Http\Controllers;

use App\Models\Module;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
class ModuleController extends Controller
{
    public function index()
    {
        $modules = Module::with('elements')
            ->orderBy('code_module')
            ->get();

         return Inertia::render('Academique/Modules/Index', [
            'modules' => $modules,
        ]);
    }

    public function store(Request $request)
    {
        // Handle bulk import
        if ($request->has('modules') && is_array($request->modules)) {
            return $this->bulkStore($request);
        }

        $validated = $request->validate([
            'code_module' => ['required', 'string', 'max:20', 'unique:modules,code_module'],
            'nom_module'  => ['required', 'string', 'max:255'],
            'type_module' => ['required', 'in:CONNAISSANCE,HORIZONTAL,STAGE,THESE'],
            'credits'     => ['required', 'numeric', 'min:0'],
        ]);

        $module = Module::create($validated);

        return redirect()->route('academique.modules.index')->with('success', 'Module créé avec succès.');
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

       return redirect()->route('academique.modules.index')->with('success', 'Module supprimé avec succès.');
    }

    /**
     * Bulk store modules from Excel import
     */
    protected function bulkStore(Request $request)
    {
        $modules = $request->input('modules', []);
        
        if (empty($modules)) {
            return redirect()->back()
                ->withErrors(['error' => 'Aucun module à importer.']);
        }

        DB::beginTransaction();
        try {
            $created = 0;
            $skipped = 0;
            $errors = [];

            foreach ($modules as $moduleData) {
                try {
                    // Validate each module data
                    $validated = validator($moduleData, [
                        'code_module' => 'required|string|max:20|unique:modules,code_module',
                        'nom_module' => 'required|string|max:255',
                        'type_module' => 'required|in:CONNAISSANCE,HORIZONTAL,STAGE,THESE',
                        'credits' => 'required|numeric|min:0',
                    ])->validate();

                    // Check for duplicates
                    $exists = Module::where('code_module', $validated['code_module'])->exists();

                    if ($exists) {
                        $skipped++;
                        continue;
                    }

                    Module::create($validated);
                    $created++;

                } catch (\Exception $e) {
                    $errors[] = "Erreur ligne: " . $e->getMessage();
                }
            }

            DB::commit();

            $message = "Import terminé: {$created} modules créés";
            if ($skipped > 0) {
                $message .= ", {$skipped} doublons ignorés";
            }
            if (!empty($errors)) {
                $message .= ". Erreurs: " . implode(', ', array_slice($errors, 0, 3));
            }

            return redirect()->route('academique.modules.index')
                ->with('success', $message);

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Erreur lors de l\'import: ' . $e->getMessage()]);
        }
    }
}
