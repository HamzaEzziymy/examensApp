<?php

namespace App\Http\Controllers;

use App\Models\Stage;
use App\Models\InscriptionPedagogique;
use App\Models\Module;
use App\Models\Enseignant;
use App\Models\UserFiliereAnnee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class StageController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Get user's selected filiere and year for filtering
        $userFiliereAnnee = auth()->user()->userFiliereAnnees()->first();
        $selectedFiliere = $userFiliereAnnee ? $userFiliereAnnee->id_filiere : null;
        $selectedAnnee = $userFiliereAnnee ? $userFiliereAnnee->id_annee : null;

        // Build query for stages with relationships
        $stagesQuery = Stage::with([
            'inscriptionPedagogique.inscriptionAdministrative.etudiant',
            'inscriptionPedagogique.inscriptionAdministrative.section.filiere',
            'inscriptionPedagogique.inscriptionAdministrative.niveau',
            'module',
            'encadrantFaculte'
        ])->orderBy('created_at', 'desc');

        // Apply filiere filter if a specific filiere is selected
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $stagesQuery->whereHas('inscriptionPedagogique.inscriptionAdministrative.section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }

        // Apply year filter if a specific year is selected
        if ($selectedAnnee && $selectedAnnee !== 'all') {
            $stagesQuery->whereHas('inscriptionPedagogique.inscriptionAdministrative', function ($query) use ($selectedAnnee) {
                $query->where('id_annee', $selectedAnnee);
            });
        }

        $stages = $stagesQuery->get();

        // Get data for form dropdowns
        $inscriptionsPedagogiquesQuery = InscriptionPedagogique::with([
            'inscriptionAdministrative.etudiant',
            'inscriptionAdministrative.section.filiere',
            'offreFormation.module'
        ]);

        // Apply same filters to inscriptions
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $inscriptionsPedagogiquesQuery->whereHas('inscriptionAdministrative.section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }

        if ($selectedAnnee && $selectedAnnee !== 'all') {
            $inscriptionsPedagogiquesQuery->whereHas('inscriptionAdministrative', function ($query) use ($selectedAnnee) {
                $query->where('id_annee', $selectedAnnee);
            });
        }

        $inscriptionsPedagogiques = $inscriptionsPedagogiquesQuery->get();

        // Get modules that are stage-related
        $modules = Module::where('type_module', 'STAGE')->orderBy('nom_module')->get();
        
        // Get enseignants for faculty supervisors
        $enseignants = Enseignant::orderBy('nom')->orderBy('prenom')->get();

        return Inertia::render('GestionsEtudiantes/Stages/Index', [
            'stages' => $stages,
            'inscriptionsPedagogiques' => $inscriptionsPedagogiques,
            'modules' => $modules,
            'enseignants' => $enseignants,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Handle bulk import
        if ($request->has('stages') && is_array($request->stages)) {
            return $this->bulkStore($request);
        }

        $validated = $request->validate([
            'id_inscription_pedagogique' => 'required|exists:inscriptions_pedagogiques,id_inscription_pedagogique',
            'id_module' => 'nullable|exists:modules,id_module',
            'nom_hopital' => 'required|string|max:255',
            'service' => 'nullable|string|max:255',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date|after:date_debut',
            'encadrant_hopital' => 'nullable|string|max:255',
            'encadrant_faculte' => 'nullable|exists:enseignants,id_enseignant',
            'note_stage' => 'nullable|numeric|min:0|max:20',
            'rapport_stage' => 'nullable|string|max:255',
        ], [
            'id_inscription_pedagogique.required' => 'L\'inscription pédagogique est requise.',
            'id_inscription_pedagogique.exists' => 'L\'inscription pédagogique sélectionnée n\'existe pas.',
            'nom_hopital.required' => 'Le nom de l\'hôpital est requis.',
            'date_debut.required' => 'La date de début est requise.',
            'date_fin.required' => 'La date de fin est requise.',
            'date_fin.after' => 'La date de fin doit être postérieure à la date de début.',
            'note_stage.numeric' => 'La note doit être un nombre.',
            'note_stage.min' => 'La note doit être supérieure ou égale à 0.',
            'note_stage.max' => 'La note doit être inférieure ou égale à 20.',
        ]);

        try {
            Stage::create($validated);
            return redirect()->back()->with('success', 'Stage créé avec succès.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la création du stage.'])
                ->withInput();
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $stage = Stage::findOrFail($id);

        $validated = $request->validate([
            'id_inscription_pedagogique' => 'required|exists:inscriptions_pedagogiques,id_inscription_pedagogique',
            'id_module' => 'nullable|exists:modules,id_module',
            'nom_hopital' => 'required|string|max:255',
            'service' => 'nullable|string|max:255',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date|after:date_debut',
            'encadrant_hopital' => 'nullable|string|max:255',
            'encadrant_faculte' => 'nullable|exists:enseignants,id_enseignant',
            'note_stage' => 'nullable|numeric|min:0|max:20',
            'rapport_stage' => 'nullable|string|max:255',
        ], [
            'id_inscription_pedagogique.required' => 'L\'inscription pédagogique est requise.',
            'nom_hopital.required' => 'Le nom de l\'hôpital est requis.',
            'date_debut.required' => 'La date de début est requise.',
            'date_fin.required' => 'La date de fin est requise.',
            'date_fin.after' => 'La date de fin doit être postérieure à la date de début.',
            'note_stage.numeric' => 'La note doit être un nombre.',
            'note_stage.min' => 'La note doit être supérieure ou égale à 0.',
            'note_stage.max' => 'La note doit être inférieure ou égale à 20.',
        ]);

        try {
            $stage->update($validated);
            return redirect()->back()->with('success', 'Stage mis à jour avec succès.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la mise à jour du stage.']);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $stage = Stage::findOrFail($id);
            $stage->delete();
            
            return redirect()->back()->with('success', 'Stage supprimé avec succès.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la suppression du stage.']);
        }
    }

    /**
     * Bulk store stages from Excel import
     */
    protected function bulkStore(Request $request)
    {
        $stages = $request->input('stages', []);
        
        if (empty($stages)) {
            return redirect()->back()
                ->withErrors(['error' => 'Aucun stage à importer.']);
        }

        DB::beginTransaction();
        try {
            $created = 0;
            $skipped = 0;
            $errors = [];

            foreach ($stages as $stageData) {
                try {
                    // Validate each stage data
                    $validated = validator($stageData, [
                        'id_inscription_pedagogique' => 'required|exists:inscriptions_pedagogiques,id_inscription_pedagogique',
                        'id_module' => 'nullable|exists:modules,id_module',
                        'nom_hopital' => 'required|string|max:255',
                        'service' => 'nullable|string|max:255',
                        'date_debut' => 'required|date',
                        'date_fin' => 'required|date|after:date_debut',
                        'encadrant_hopital' => 'nullable|string|max:255',
                        'encadrant_faculte' => 'nullable|exists:enseignants,id_enseignant',
                        'note_stage' => 'nullable|numeric|min:0|max:20',
                        'rapport_stage' => 'nullable|string|max:255',
                    ])->validate();

                    // Check for duplicates (same student, hospital, and dates)
                    $exists = Stage::where('id_inscription_pedagogique', $validated['id_inscription_pedagogique'])
                        ->where('nom_hopital', $validated['nom_hopital'])
                        ->where('date_debut', $validated['date_debut'])
                        ->where('date_fin', $validated['date_fin'])
                        ->exists();

                    if ($exists) {
                        $skipped++;
                        continue;
                    }

                    Stage::create($validated);
                    $created++;

                } catch (\Exception $e) {
                    $errors[] = "Erreur ligne: " . $e->getMessage();
                }
            }

            DB::commit();

            $message = "Import terminé: {$created} stages créés";
            if ($skipped > 0) {
                $message .= ", {$skipped} doublons ignorés";
            }
            if (!empty($errors)) {
                $message .= ". Erreurs: " . implode(', ', array_slice($errors, 0, 3));
            }

            return redirect()->route('inscriptions.stages.index')
                ->with('success', $message);

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Erreur lors de l\'import: ' . $e->getMessage()]);
        }
    }

    /**
     * Bulk destroy stages.
     */
    public function bulkDestroy(Request $request)
    {
        $ids = $request->input('ids', []);
        
        if (empty($ids)) {
            return redirect()->back()
                ->withErrors(['error' => 'Aucun stage sélectionné.']);
        }

        try {
            $deleted = 0;
            $failed = [];

            foreach ($ids as $id) {
                $stage = Stage::find($id);
                
                if (!$stage) {
                    $failed[] = "Stage {$id} non trouvé";
                    continue;
                }

                $stage->delete();
                $deleted++;
            }

            $message = "{$deleted} stages supprimés";
            if (!empty($failed)) {
                $message .= ", " . count($failed) . " échecs";
            }

            return redirect()->back()->with([
                'success' => $message,
                'bulk_delete_errors' => $failed
            ]);

        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la suppression: ' . $e->getMessage()]);
        }
    }
}