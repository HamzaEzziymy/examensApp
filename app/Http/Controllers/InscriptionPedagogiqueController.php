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
    public function index()
    {
        // Get user's selected filiere and year
        $userFiliereAnnee = auth()->user()->userFiliereAnnees()->first();
        $selectedFiliere = $userFiliereAnnee ? $userFiliereAnnee->id_filiere : null;
        $selectedAnnee = $userFiliereAnnee ? $userFiliereAnnee->id_annee : null;
        
        // Build query for pedagogical inscriptions
        $inscriptionsQuery = InscriptionPedagogique::with([
            'inscriptionAdministrative.etudiant',
            'inscriptionAdministrative.anneeUniversitaire',
            'inscriptionAdministrative.section.filiere',
            'offreFormation.module',
            'offreFormation.semestre.niveau',
            'offreFormation.section.filiere'
        ])->orderBy('created_at', 'desc');
        
        // Apply filiere filter if a specific filiere is selected
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $inscriptionsQuery->whereHas('inscriptionAdministrative.section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        
        // Apply year filter if a specific year is selected
        if ($selectedAnnee && $selectedAnnee !== 'all') {
            $inscriptionsQuery->whereHas('inscriptionAdministrative', function ($query) use ($selectedAnnee) {
                $query->where('id_annee', $selectedAnnee);
            });
        }
        
        $inscriptions_pedagogiques = $inscriptionsQuery->get();

        // Filter supporting data based on selections
        $offres_formation = OffreFormation::with([
            'module', 
            'semestre.niveau',
            'section.filiere'
        ])->get();
        
        // Filter administrative inscriptions
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
            'type_inscription' => 'required|in:Normal,Credit,Anticipe',
            'credits_acquis' => 'nullable|integer|min:0|max:30',
        ], [
            'id_inscription_admin.required' => 'L\'inscription administrative est requise.',
            'id_inscription_admin.exists' => 'L\'inscription administrative sélectionnée n\'existe pas.',
            'id_offre.required' => 'L\'offre de formation est requise.',
            'id_offre.exists' => 'L\'offre de formation sélectionnée n\'existe pas.',
            'type_inscription.required' => 'Le type d\'inscription est requis.',
            'type_inscription.in' => 'Le type d\'inscription doit être Normal, Credit ou Anticipe.',
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
            'type_inscription' => 'required|in:Normal,Credit,Anticipe',
            'credits_acquis' => 'nullable|integer|min:0|max:30',
        ], [
            'id_inscription_admin.required' => 'L\'inscription administrative est requise.',
            'id_inscription_admin.exists' => 'L\'inscription administrative sélectionnée n\'existe pas.',
            'id_offre.required' => 'L\'offre de formation est requise.',
            'id_offre.exists' => 'L\'offre de formation sélectionnée n\'existe pas.',
            'type_inscription.required' => 'Le type d\'inscription est requis.',
            'type_inscription.in' => 'Le type d\'inscription doit être Normal, Credit ou Anticipe.',
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
            'request_data' => request()->all()
        ]);
        
        try {
            $inscription = InscriptionPedagogique::findOrFail($id);
            
            \Log::info('Inscription found', [
                'inscription_id' => $inscription->id_inscription_pedagogique,
                'inscription_data' => $inscription->toArray()
            ]);
            
            // Check if inscription has related records that would prevent deletion
            $hasCapitalisations = $inscription->capitalisations()->exists();
            $hasStages = $inscription->stages()->exists();
            $hasAnonymats = $inscription->anonymats()->exists();
            $hasResultats = $inscription->resultatsElements()->exists() || $inscription->resultatsModules()->exists();
            
            \Log::info('Checking related records', [
                'has_capitalisations' => $hasCapitalisations,
                'has_stages' => $hasStages,
                'has_anonymats' => $hasAnonymats,
                'has_resultats' => $hasResultats
            ]);
            
            if ($hasCapitalisations || $hasStages || $hasAnonymats || $hasResultats) {
                \Log::warning('Cannot delete inscription due to related records');
                return redirect()->back()
                    ->withErrors(['error' => 'Impossible de supprimer cette inscription car elle contient des données liées (capitalisations, stages, résultats, etc.).']);
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
                    'type_inscription' => 'required|in:Normal,Credit,Anticipe',
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
