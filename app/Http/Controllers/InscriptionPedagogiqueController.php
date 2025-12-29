<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Etudiant;
use App\Models\InscriptionAdministrative;
use App\Models\InscriptionPedagogique;
use App\Models\Module;
use App\Models\OffreFormation;
use App\Models\UserFiliereAnnee;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Validator;

class InscriptionPedagogiqueController extends Controller
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
        $filterType = $request->input('type', '');
        $filterModule = $request->input('module', '');
        $filterNiveau = $request->input('niveau', '');
        $filterSection = $request->input('section', '');
        $perPage = $request->input('per_page', 25);
        
        // Build query for pedagogical inscriptions with backend filtering
        $inscriptionsQuery = InscriptionPedagogique::with([
            'inscriptionAdministrative.etudiant',
            'inscriptionAdministrative.anneeUniversitaire',
            'inscriptionAdministrative.section.filiere',
            'offreFormation.module',
            'offreFormation.semestre.niveau',
            'offreFormation.section.filiere'
        ]);
        
        // Apply user's filiere filter if a specific filiere is selected
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $inscriptionsQuery->whereHas('inscriptionAdministrative.section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        
        // Apply user's year filter if a specific year is selected (default context)
        if ($selectedAnnee && $selectedAnnee !== 'all') {
            $inscriptionsQuery->whereHas('inscriptionAdministrative', function ($query) use ($selectedAnnee) {
                $query->where('id_annee', $selectedAnnee);
            });
        }
        
        // Apply search filter (CNE, nom, prenom, module name)
        if (!empty($search)) {
            $inscriptionsQuery->where(function ($query) use ($search) {
                $query->whereHas('inscriptionAdministrative.etudiant', function ($q) use ($search) {
                    $q->where('cne', 'like', "%{$search}%")
                      ->orWhere('nom', 'like', "%{$search}%")
                      ->orWhere('prenom', 'like', "%{$search}%");
                })
                ->orWhereHas('offreFormation.module', function ($q) use ($search) {
                    $q->where('nom_module', 'like', "%{$search}%")
                      ->orWhere('code_module', 'like', "%{$search}%");
                });
            });
        }
        
        // Apply type filter
        if (!empty($filterType)) {
            $inscriptionsQuery->where('type_inscription', $filterType);
        }
        
        // Apply module filter
        if (!empty($filterModule)) {
            $inscriptionsQuery->whereHas('offreFormation', function ($q) use ($filterModule) {
                $q->where('id_module', $filterModule);
            });
        }
        
        // Apply niveau filter
        if (!empty($filterNiveau)) {
            $inscriptionsQuery->whereHas('offreFormation.semestre.niveau', function ($q) use ($filterNiveau) {
                $q->where('id_niveau', $filterNiveau);
            });
        }
        
        // Apply section filter
        if (!empty($filterSection)) {
            $inscriptionsQuery->whereHas('offreFormation', function ($q) use ($filterSection) {
                $q->where('id_section', $filterSection);
            });
        }
        
        // Order and get total count
        $inscriptionsQuery->orderBy('created_at', 'desc');
        $totalCount = $inscriptionsQuery->count();
        
        // Paginate results
        $inscriptions_pedagogiques = $inscriptionsQuery->paginate($perPage)->withQueryString();

        // Filter offres formation by user's selected filiere
        $offresQuery = OffreFormation::with([
            'module', 
            'semestre.niveau',
            'section.filiere'
        ]);
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $offresQuery->whereHas('section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        $offres_formation = $offresQuery->get();
        
        // Get modules for filter dropdown (also filtered by filiere)
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
        
        // Filter administrative inscriptions (for add/edit forms)
        $inscriptionsAdminQuery = InscriptionAdministrative::with(['etudiant', 'section.filiere'])
            ->orderBy('created_at', 'desc');
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $inscriptionsAdminQuery->whereHas('section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        if ($selectedAnnee && $selectedAnnee !== 'all') {
            $inscriptionsAdminQuery->where('id_annee', $selectedAnnee);
        }
        $inscriptions_administratives = $inscriptionsAdminQuery->get();

        // Filter students for import functionality
        $etudiantsQuery = Etudiant::select('id_etudiant', 'cne', 'nom', 'prenom')
            ->with('section.filiere');
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $etudiantsQuery->whereHas('section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        $etudiants = $etudiantsQuery->get();

        return Inertia::render('GestionsEtudiantes/InscriptionsPedagogiques/Index', [
            'inscriptions_pedagogiques' => $inscriptions_pedagogiques,
            'offres_formation' => $offres_formation,
            'inscriptions_administratives' => $inscriptions_administratives,
            'etudiants' => $etudiants,
            'modules' => $modules,
            'niveaux' => $niveaux,
            'sections' => $sections,
            'filters' => [
                'search' => $search,
                'type' => $filterType,
                'module' => $filterModule,
                'niveau' => $filterNiveau,
                'section' => $filterSection,
                'per_page' => $perPage,
            ],
            'totalCount' => $totalCount,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        \Log::info('Store single inscription called with data:', $request->all());
        
        // Validation rules
        $validator = Validator::make($request->all(), [
            'id_inscription_admin' => 'required|integer|exists:inscriptions_administratives,id_inscription_admin',
            'id_offre' => 'required|integer|exists:offre_formation,id_offre',
            'type_inscription' => 'required|in:Normal,Credit,Anticipe,Capitalisation',
            'credits_acquis' => 'nullable|integer|min:0|max:30',
        ], [
            'id_inscription_admin.required' => 'L\'inscription administrative est requise.',
            'id_inscription_admin.exists' => 'L\'inscription administrative sélectionnée n\'existe pas.',
            'id_offre.required' => 'L\'offre de formation est requise.',
            'id_offre.exists' => 'L\'offre de formation sélectionnée n\'existe pas.',
            'type_inscription.required' => 'Le type d\'inscription est requis.',
            'type_inscription.in' => 'Le type d\'inscription doit être Normal, Credit, Anticipe ou Capitalisation.',
            'credits_acquis.integer' => 'Les crédits acquis doivent être un nombre entier.',
            'credits_acquis.min' => 'Les crédits acquis ne peuvent pas être négatifs.',
            'credits_acquis.max' => 'Les crédits acquis ne peuvent pas dépasser 30.',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            // Create the pedagogical inscription
            $inscription = InscriptionPedagogique::create([
                'id_inscription_admin' => $request->id_inscription_admin,
                'id_offre' => $request->id_offre,
                'type_inscription' => $request->type_inscription ?? 'Normal',
                'credits_acquis' => $request->credits_acquis ?? 0,
            ]);

            return redirect()->back()->with('success', 'Inscription pédagogique créée avec succès.');

        } catch (\Exception $e) {
            \Log::error('Store single inscription exception:', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la création de l\'inscription pédagogique: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $inscription = InscriptionPedagogique::findOrFail($id);

        // Validation rules
        $validator = Validator::make($request->all(), [
            'id_inscription_admin' => 'required|integer|exists:inscriptions_administratives,id_inscription_admin',
            'id_offre' => 'required|integer|exists:offre_formation,id_offre',
            'type_inscription' => 'required|in:Normal,Credit,Anticipe,Capitalisation',
            'credits_acquis' => 'nullable|integer|min:0|max:30',
        ], [
            'id_inscription_admin.required' => 'L\'inscription administrative est requise.',
            'id_inscription_admin.exists' => 'L\'inscription administrative sélectionnée n\'existe pas.',
            'id_offre.required' => 'L\'offre de formation est requise.',
            'id_offre.exists' => 'L\'offre de formation sélectionnée n\'existe pas.',
            'type_inscription.required' => 'Le type d\'inscription est requis.',
            'type_inscription.in' => 'Le type d\'inscription doit être Normal, Credit, Anticipe ou Capitalisation.',
            'credits_acquis.integer' => 'Les crédits acquis doivent être un nombre entier.',
            'credits_acquis.min' => 'Les crédits acquis ne peuvent pas être négatifs.',
            'credits_acquis.max' => 'Les crédits acquis ne peuvent pas dépasser 30.',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            // Update the pedagogical inscription
            $inscription->update([
                'id_inscription_admin' => $request->id_inscription_admin,
                'id_offre' => $request->id_offre,
                'type_inscription' => $request->type_inscription ?? 'Normal',
                'credits_acquis' => $request->credits_acquis ?? 0,
            ]);

            return redirect()->back()->with('success', 'Inscription pédagogique mise à jour avec succès.');

        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la mise à jour de l\'inscription pédagogique.']);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        \Log::info('=== DEBUGGING INSCRIPTION PEDAGOGIQUE DELETE ===', [
            'id' => $id,
            'request_method' => request()->method(),
            'request_url' => request()->url(),
            'request_data' => request()->all(),
            'force_delete' => request()->get('force', false)
        ]);
        
        try {
            $inscription = InscriptionPedagogique::findOrFail($id);
            
            \Log::info('Inscription found', [
                'inscription_id' => $inscription->id_inscription_pedagogique,
                'inscription_data' => $inscription->toArray()
            ]);
            
            // Check for force delete parameter (for testing)
            $forceDelete = request()->get('force', false);
            
            if (!$forceDelete) {
                // Check if inscription has related records that would prevent deletion
                $capitalisationsCount = $inscription->capitalisations()->count();
                $stagesCount = $inscription->stages()->count();
                $anonymatsCount = $inscription->anonymats()->count();
                $repartitionsCount = $inscription->repartitions()->count();
                $resultatsElementsCount = $inscription->resultatsElements()->count();
                $resultatsModulesCount = $inscription->resultatsModules()->count();
                $reclamationsCount = $inscription->reclamations()->count();
                
                \Log::info('Checking related records with counts', [
                    'capitalisations_count' => $capitalisationsCount,
                    'stages_count' => $stagesCount,
                    'anonymats_count' => $anonymatsCount,
                    'repartitions_count' => $repartitionsCount,
                    'resultats_elements_count' => $resultatsElementsCount,
                    'resultats_modules_count' => $resultatsModulesCount,
                    'reclamations_count' => $reclamationsCount
                ]);
                
                $hasRelatedRecords = $capitalisationsCount > 0 || 
                                   $stagesCount > 0 || 
                                   $anonymatsCount > 0 || 
                                   $repartitionsCount > 0 ||
                                   $resultatsElementsCount > 0 || 
                                   $resultatsModulesCount > 0 ||
                                   $reclamationsCount > 0;
                
                if ($hasRelatedRecords) {
                    $relatedTables = [];
                    if ($capitalisationsCount > 0) $relatedTables[] = "capitalisations ({$capitalisationsCount})";
                    if ($stagesCount > 0) $relatedTables[] = "stages ({$stagesCount})";
                    if ($anonymatsCount > 0) $relatedTables[] = "anonymats ({$anonymatsCount})";
                    if ($repartitionsCount > 0) $relatedTables[] = "repartitions ({$repartitionsCount})";
                    if ($resultatsElementsCount > 0) $relatedTables[] = "resultats elements ({$resultatsElementsCount})";
                    if ($resultatsModulesCount > 0) $relatedTables[] = "resultats modules ({$resultatsModulesCount})";
                    if ($reclamationsCount > 0) $relatedTables[] = "reclamations ({$reclamationsCount})";
                    
                    $errorMessage = 'Impossible de supprimer cette inscription car elle contient des données liées: ' . implode(', ', $relatedTables);
                    
                    \Log::warning('Cannot delete inscription due to related records', [
                        'related_tables' => $relatedTables,
                        'error_message' => $errorMessage
                    ]);
                    
                    return redirect()->back()
                        ->withErrors(['error' => $errorMessage]);
                }
            } else {
                \Log::info('Force delete enabled, skipping relationship checks');
            }
            
            $inscription->delete();
            
            \Log::info('Inscription deleted successfully');
            
            return redirect()->back()->with('success', 'Inscription pédagogique supprimée avec succès.');
            
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Log::error('Inscription not found', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            return redirect()->back()
                ->withErrors(['error' => 'Inscription pédagogique introuvable.']);
        } catch (\Exception $e) {
            \Log::error('Error deleting inscription', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la suppression de l\'inscription pédagogique: ' . $e->getMessage()]);
        }
    }

    /**
     * Bulk store pedagogical inscriptions.
     * Used by the frontend bulk import functionality.
     */
    public function bulkStore(Request $request)
    {
        \Log::info('BulkStore called with data:', $request->all());
        
        $inscriptions = $request->input('inscriptions', []);
        
        if (empty($inscriptions)) {
            \Log::error('No inscriptions provided');
            return redirect()->back()
                ->withErrors(['error' => 'Aucune inscription à importer.']);
        }

        $created = 0;
        $failed = [];

        try {
            foreach ($inscriptions as $index => $inscriptionData) {
                // Validate each inscription
                $validator = Validator::make($inscriptionData, [
                    'id_inscription_admin' => 'required|integer|exists:inscriptions_administratives,id_inscription_admin',
                    'id_offre' => 'required|integer|exists:offre_formation,id_offre',
                    'type_inscription' => 'required|in:Normal,Credit,Anticipe,Capitalisation',
                    'credits_acquis' => 'nullable|integer|min:0|max:30',
                ]);

                if ($validator->fails()) {
                    $failed[] = [
                        'row' => $index + 1,
                        'errors' => $validator->errors()->all()
                    ];
                    continue;
                }

                // Create inscription
                InscriptionPedagogique::create([
                    'id_inscription_admin' => $inscriptionData['id_inscription_admin'],
                    'id_offre' => $inscriptionData['id_offre'],
                    'type_inscription' => $inscriptionData['type_inscription'] ?? 'Normal',
                    'credits_acquis' => $inscriptionData['credits_acquis'] ?? 0,
                ]);

                $created++;
            }

            $message = "Import terminé: {$created} inscriptions créées";
            if (!empty($failed)) {
                $message .= ", " . count($failed) . " erreurs";
            }

            return redirect()->back()->with([
                'success' => $message,
                'import_errors' => $failed,
                'import_success_count' => $created
            ]);

        } catch (\Exception $e) {
            \Log::error('BulkStore exception:', ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de l\'import: ' . $e->getMessage()]);
        }
    }

    /**
     * Bulk destroy pedagogical inscriptions.
     */
    public function bulkDestroy(Request $request)
    {
        $ids = $request->input('ids', []);
        
        if (empty($ids)) {
            return redirect()->back()
                ->withErrors(['error' => 'Aucune inscription sélectionnée.']);
        }

        try {
            $deleted = 0;
            $failed = [];

            foreach ($ids as $id) {
                $inscription = InscriptionPedagogique::find($id);
                
                if (!$inscription) {
                    $failed[] = "Inscription {$id} non trouvée";
                    continue;
                }

                // Check for related records
                $hasRelatedData = $inscription->capitalisations()->exists() ||
                                $inscription->stages()->exists() ||
                                $inscription->anonymats()->exists() ||
                                $inscription->resultatsElements()->exists() ||
                                $inscription->resultatsModules()->exists();

                if ($hasRelatedData) {
                    $failed[] = "Inscription {$id} contient des données liées";
                    continue;
                }

                $inscription->delete();
                $deleted++;
            }

            $message = "{$deleted} inscriptions supprimées";
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
