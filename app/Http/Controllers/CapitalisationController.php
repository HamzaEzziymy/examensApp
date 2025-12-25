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
    public function index(Request $request)
    {
        // Get user's selected filiere and year
        $userFiliereAnnee = auth()->user()->userFiliereAnnees()->first();
        $selectedFiliere = $userFiliereAnnee ? $userFiliereAnnee->id_filiere : null;
        $selectedAnnee = $userFiliereAnnee ? $userFiliereAnnee->id_annee : null;
        
        // Get filter parameters from request
        $search = $request->input('search', '');
        $filterModule = $request->input('module', '');
        $filterNiveau = $request->input('niveau', '');
        $filterSection = $request->input('section', '');
        $filterStatut = $request->input('statut', '');
        $perPage = $request->input('per_page', 25);
        
        // Build query for capitalisations with backend filtering
        $capitalisationsQuery = Capitalisation::with([
            'inscriptionPedagogique.inscriptionAdministrative.etudiant',
            'inscriptionPedagogique.inscriptionAdministrative.section.filiere',
            'inscriptionPedagogique.inscriptionAdministrative.niveau',
            'inscriptionPedagogique.inscriptionAdministrative.anneeUniversitaire',
            'module'
        ]);
        
        // Apply user's filiere filter if a specific filiere is selected
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $capitalisationsQuery->whereHas('inscriptionPedagogique.inscriptionAdministrative.section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        
        // Apply user's year filter if a specific year is selected
        if ($selectedAnnee && $selectedAnnee !== 'all') {
            $capitalisationsQuery->whereHas('inscriptionPedagogique.inscriptionAdministrative', function ($query) use ($selectedAnnee) {
                $query->where('id_annee', $selectedAnnee);
            });
        }
        
        // Apply search filter (CNE, nom, prenom, email, module name, section, filiere, niveau, annee)
        if (!empty($search)) {
            $capitalisationsQuery->where(function ($query) use ($search) {
                $query->whereHas('inscriptionPedagogique.inscriptionAdministrative.etudiant', function ($q) use ($search) {
                    $q->where('cne', 'like', "%{$search}%")
                      ->orWhere('nom', 'like', "%{$search}%")
                      ->orWhere('prenom', 'like', "%{$search}%")
                      ->orWhere('mail_academique', 'like', "%{$search}%");
                })
                ->orWhereHas('module', function ($q) use ($search) {
                    $q->where('nom_module', 'like', "%{$search}%")
                      ->orWhere('code_module', 'like', "%{$search}%");
                })
                ->orWhereHas('inscriptionPedagogique.inscriptionAdministrative.section', function ($q) use ($search) {
                    $q->where('nom_section', 'like', "%{$search}%");
                })
                ->orWhereHas('inscriptionPedagogique.inscriptionAdministrative.section.filiere', function ($q) use ($search) {
                    $q->where('nom_filiere', 'like', "%{$search}%");
                })
                ->orWhereHas('inscriptionPedagogique.inscriptionAdministrative.niveau', function ($q) use ($search) {
                    $q->where('nom_niveau', 'like', "%{$search}%");
                })
                ->orWhereHas('inscriptionPedagogique.inscriptionAdministrative.anneeUniversitaire', function ($q) use ($search) {
                    $q->where('annee_univ', 'like', "%{$search}%");
                });
            });
        }
        
        // Apply module filter
        if (!empty($filterModule)) {
            $capitalisationsQuery->where('id_module', $filterModule);
        }
        
        // Apply niveau filter
        if (!empty($filterNiveau)) {
            $capitalisationsQuery->whereHas('inscriptionPedagogique.inscriptionAdministrative', function ($q) use ($filterNiveau) {
                $q->where('id_niveau', $filterNiveau);
            });
        }
        
        // Apply section filter
        if (!empty($filterSection)) {
            $capitalisationsQuery->whereHas('inscriptionPedagogique.inscriptionAdministrative', function ($q) use ($filterSection) {
                $q->where('id_section', $filterSection);
            });
        }
        
        // Apply statut filter (valide, expiree, expire_bientot)
        if (!empty($filterStatut)) {
            $now = now();
            $thirtyDaysFromNow = now()->addDays(30);
            
            if ($filterStatut === 'valide') {
                $capitalisationsQuery->where(function ($q) use ($now) {
                    $q->whereNull('date_expiration')
                      ->orWhere('date_expiration', '>', $now);
                });
            } elseif ($filterStatut === 'expiree') {
                $capitalisationsQuery->where('date_expiration', '<', $now);
            } elseif ($filterStatut === 'expire_bientot') {
                $capitalisationsQuery->where('date_expiration', '>', $now)
                    ->where('date_expiration', '<=', $thirtyDaysFromNow);
            }
        }
        
        // Order and get total count
        $capitalisationsQuery->orderBy('date_capitalisation', 'desc');
        $totalCount = $capitalisationsQuery->count();
        
        // Paginate results
        $capitalisations = $capitalisationsQuery->paginate($perPage)->withQueryString();

        // Get pedagogical inscriptions for the dropdown (for add/edit forms) - LIMIT to avoid loading too much data
        $inscriptionsPedagogiquesQuery = InscriptionPedagogique::with([
            'inscriptionAdministrative.etudiant:id_etudiant,cne,nom,prenom',
            'inscriptionAdministrative.section:id_section,nom_section,id_filiere',
            'inscriptionAdministrative.section.filiere:id_filiere,nom_filiere',
            'inscriptionAdministrative.niveau:id_niveau,nom_niveau',
            'offreFormation.module:id_module,nom_module,code_module'
        ])->select('id_inscription_pedagogique', 'id_inscription_admin', 'id_offre');
        
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $inscriptionsPedagogiquesQuery->whereHas('inscriptionAdministrative.section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        
        $inscriptionsPedagogiques = $inscriptionsPedagogiquesQuery->limit(500)->get();

        // Get modules for the dropdown
        $modulesQuery = Module::orderBy('nom_module');
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $modulesQuery->whereHas('offresFormation.section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        $modules = $modulesQuery->get();
        
        // Get niveaux for filter dropdown
        $niveaux = \App\Models\Niveau::orderBy('ordre')->get();
        
        // Get sections for filter dropdown
        $sectionsQuery = \App\Models\Section::with('filiere');
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $sectionsQuery->whereHas('filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        $sections = $sectionsQuery->get();
        
        return Inertia::render('GestionsEtudiantes/Capitalisations/Index', [
            'capitalisations' => $capitalisations,
            'inscriptionsPedagogiques' => $inscriptionsPedagogiques,
            'modules' => $modules,
            'niveaux' => $niveaux,
            'sections' => $sections,
            'filters' => [
                'search' => $search,
                'module' => $filterModule,
                'niveau' => $filterNiveau,
                'section' => $filterSection,
                'statut' => $filterStatut,
                'per_page' => $perPage,
            ],
            'totalCount' => $totalCount,
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
