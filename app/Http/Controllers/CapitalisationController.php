<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Capitalisation;
use App\Models\InscriptionPedagogique;
use App\Models\Module;
use App\Models\UserFiliereAnnee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CapitalisationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Get user's selected filiere and year
        $userFiliereAnnee = auth()->user()->userFiliereAnnees()->first();
        $selectedFiliere = $userFiliereAnnee ? $userFiliereAnnee->id_filiere : null;
        
        // Build query for capitalisations
        $capitalisationsQuery = Capitalisation::with([
            'inscriptionPedagogique.inscriptionAdministrative.etudiant',
            'inscriptionPedagogique.inscriptionAdministrative.section.filiere',
            'inscriptionPedagogique.inscriptionAdministrative.niveau',
            'inscriptionPedagogique.inscriptionAdministrative.anneeUniversitaire',
            'module'
        ])->orderBy('date_capitalisation', 'desc');
        
        // Apply filiere filter if a specific filiere is selected
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $capitalisationsQuery->whereHas('inscriptionPedagogique.inscriptionAdministrative.section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        
        $capitalisations = $capitalisationsQuery->get();

        // Get pedagogical inscriptions for the dropdown
        $inscriptionsPedagogiquesQuery = InscriptionPedagogique::with([
            'inscriptionAdministrative.etudiant',
            'inscriptionAdministrative.section.filiere',
            'inscriptionAdministrative.niveau',
            'offreFormation.module'
        ]);
        
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $inscriptionsPedagogiquesQuery->whereHas('inscriptionAdministrative.section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        
        $inscriptionsPedagogiques = $inscriptionsPedagogiquesQuery->get();

        // Get modules for the dropdown
        $modulesQuery = Module::orderBy('nom_module');
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $modulesQuery->whereHas('offresFormation.section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        $modules = $modulesQuery->get();
        
        return Inertia::render('GestionsEtudiantes/Capitalisations/Index', [
            'capitalisations' => $capitalisations,
            'inscriptionsPedagogiques' => $inscriptionsPedagogiques,
            'modules' => $modules
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Handle bulk import
        if ($request->has('capitalisations') && is_array($request->capitalisations)) {
            return $this->bulkStore($request);
        }

        // Single capitalisation creation
        $validated = $request->validate([
            'id_inscription_pedagogique' => 'required|exists:inscriptions_pedagogiques,id_inscription_pedagogique',
            'id_module' => 'required|exists:modules,id_module',
            'date_capitalisation' => 'required|date',
            'date_expiration' => 'nullable|date|after:date_capitalisation',
        ]);

        // Check for duplicate capitalisation
        $exists = Capitalisation::where('id_inscription_pedagogique', $validated['id_inscription_pedagogique'])
            ->where('id_module', $validated['id_module'])
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'id_inscription_pedagogique' => 'Une capitalisation existe déjà pour cet étudiant et ce module.'
            ]);
        }

        Capitalisation::create($validated);

        return redirect()->route('inscriptions.capitalisations.index')
            ->with('success', 'Capitalisation créée avec succès.');
    }

    /**
     * Bulk store capitalisations from Excel import
     */
    protected function bulkStore(Request $request)
    {
        $capitalisationsData = $request->capitalisations;
        $created = 0;
        $skipped = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($capitalisationsData as $index => $data) {
                $validator = \Illuminate\Support\Facades\Validator::make($data, [
                    'id_inscription_pedagogique' => 'required|exists:inscriptions_pedagogiques,id_inscription_pedagogique',
                    'id_module' => 'required|exists:modules,id_module',
                    'date_capitalisation' => 'required|date',
                    'date_expiration' => 'nullable|date|after:date_capitalisation',
                ]);

                if ($validator->fails()) {
                    $skipped++;
                    $errors[] = [
                        'row' => $index + 2,
                        'errors' => $validator->errors()->all(),
                        'data' => $data
                    ];
                } else {
                    // Check for duplicates
                    $exists = Capitalisation::where('id_inscription_pedagogique', $data['id_inscription_pedagogique'])
                        ->where('id_module', $data['id_module'])
                        ->exists();

                    if ($exists) {
                        $skipped++;
                        $errors[] = [
                            'row' => $index + 2,
                            'errors' => ['Capitalisation déjà existante pour cet étudiant et ce module'],
                            'data' => $data
                        ];
                    } else {
                        try {
                            Capitalisation::create($validator->validated());
                            $created++;
                        } catch (\Exception $e) {
                            $skipped++;
                            $errors[] = [
                                'row' => $index + 2,
                                'errors' => ['Erreur de base de données: ' . $e->getMessage()],
                                'data' => $data
                            ];
                        }
                    }
                }
            }
            DB::commit();

            // Return appropriate response based on results
            if (empty($errors)) {
                return redirect()->route('inscriptions.capitalisations.index')
                    ->with('success', "Import réussi: {$created} capitalisations créées avec succès");
            } else {
                return redirect()->route('inscriptions.capitalisations.index')
                    ->with('import_partial', "Import partiel: {$created} capitalisations créées, {$skipped} avec erreurs")
                    ->with('import_errors', $errors);
            }

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->route('inscriptions.capitalisations.index')
                ->withErrors(['import' => 'Erreur lors de l\'import: ' . $e->getMessage()]);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $capitalisation = Capitalisation::with([
            'inscriptionPedagogique.inscriptionAdministrative.etudiant',
            'inscriptionPedagogique.inscriptionAdministrative.section.filiere',
            'inscriptionPedagogique.inscriptionAdministrative.niveau',
            'inscriptionPedagogique.inscriptionAdministrative.anneeUniversitaire',
            'module'
        ])->findOrFail($id);

        return Inertia::render('GestionsEtudiantes/Capitalisations/Show', [
            'capitalisation' => $capitalisation,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $capitalisation = Capitalisation::findOrFail($id);

        $validated = $request->validate([
            'id_inscription_pedagogique' => ['required', 'exists:inscriptions_pedagogiques,id_inscription_pedagogique'],
            'id_module' => ['required', 'exists:modules,id_module'],
            'date_capitalisation' => 'required|date',
            'date_expiration' => 'nullable|date|after:date_capitalisation',
        ]);

        // Check for duplicates (excluding current record)
        $exists = Capitalisation::where('id_inscription_pedagogique', $validated['id_inscription_pedagogique'])
            ->where('id_module', $validated['id_module'])
            ->where('id_capitalisation', '!=', $id)
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'id_inscription_pedagogique' => 'Une capitalisation existe déjà pour cet étudiant et ce module.'
            ]);
        }

        $capitalisation->update($validated);

        return redirect()->route('inscriptions.capitalisations.index')
            ->with('success', 'Capitalisation mise à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $capitalisation = Capitalisation::findOrFail($id);
        $capitalisation->delete();

        return redirect()->route('inscriptions.capitalisations.index')
            ->with('success', 'Capitalisation supprimée avec succès.');
    }

    /**
     * Bulk delete capitalisations
     */
    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:capitalisations,id_capitalisation'
        ]);

        $deleted = Capitalisation::whereIn('id_capitalisation', $request->ids)->delete();

        return redirect()->route('inscriptions.capitalisations.index')
            ->with('success', "Suppression terminée: {$deleted} capitalisations supprimées.");
    }
}
