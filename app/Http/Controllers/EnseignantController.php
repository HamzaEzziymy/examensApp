<?php

namespace App\Http\Controllers;

use App\Models\Enseignant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class EnseignantController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $enseignants = Enseignant::with('user')
            ->orderBy('nom')
            ->orderBy('prenom')
            ->get();

        // Get users that are not already linked to an enseignant
        $availableUsers = User::whereNotIn('id', function($query) {
            $query->select('id_utilisateur')
                  ->from('enseignants')
                  ->whereNotNull('id_utilisateur');
        })->orderBy('name')->get();

        return Inertia::render('Configuration/Enseignants/Index', [
            'enseignants' => $enseignants,
            'availableUsers' => $availableUsers,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Handle bulk import
        if ($request->has('enseignants') && is_array($request->enseignants)) {
            return $this->bulkStore($request);
        }

        $validated = $request->validate([
            'id_utilisateur' => 'nullable|exists:users,id|unique:enseignants,id_utilisateur',
            'matricule' => 'required|string|max:20|unique:enseignants,matricule',
            'nom' => 'required|string|max:50',
            'prenom' => 'required|string|max:50',
            'email' => 'required|email|max:100|unique:enseignants,email',
            'grade' => 'nullable|string|max:50',
            'departement' => 'nullable|string|max:100',
            'chemin_signature_scan' => 'nullable|string|max:255',
        ], [
            'matricule.required' => 'Le matricule est requis.',
            'matricule.unique' => 'Ce matricule existe déjà.',
            'nom.required' => 'Le nom est requis.',
            'prenom.required' => 'Le prénom est requis.',
            'email.required' => 'L\'email est requis.',
            'email.email' => 'L\'email doit être valide.',
            'email.unique' => 'Cet email existe déjà.',
            'id_utilisateur.unique' => 'Cet utilisateur est déjà lié à un enseignant.',
        ]);

        try {
            Enseignant::create($validated);
            return redirect()->back()->with('success', 'Enseignant créé avec succès.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la création de l\'enseignant.'])
                ->withInput();
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $enseignant = Enseignant::findOrFail($id);

        $validated = $request->validate([
            'id_utilisateur' => [
                'nullable',
                'exists:users,id',
                Rule::unique('enseignants', 'id_utilisateur')->ignore($enseignant->id_enseignant, 'id_enseignant')
            ],
            'matricule' => [
                'required',
                'string',
                'max:20',
                Rule::unique('enseignants', 'matricule')->ignore($enseignant->id_enseignant, 'id_enseignant')
            ],
            'nom' => 'required|string|max:50',
            'prenom' => 'required|string|max:50',
            'email' => [
                'required',
                'email',
                'max:100',
                Rule::unique('enseignants', 'email')->ignore($enseignant->id_enseignant, 'id_enseignant')
            ],
            'grade' => 'nullable|string|max:50',
            'departement' => 'nullable|string|max:100',
            'chemin_signature_scan' => 'nullable|string|max:255',
        ], [
            'matricule.required' => 'Le matricule est requis.',
            'matricule.unique' => 'Ce matricule existe déjà.',
            'nom.required' => 'Le nom est requis.',
            'prenom.required' => 'Le prénom est requis.',
            'email.required' => 'L\'email est requis.',
            'email.email' => 'L\'email doit être valide.',
            'email.unique' => 'Cet email existe déjà.',
            'id_utilisateur.unique' => 'Cet utilisateur est déjà lié à un enseignant.',
        ]);

        try {
            $enseignant->update($validated);
            return redirect()->back()->with('success', 'Enseignant mis à jour avec succès.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la mise à jour de l\'enseignant.']);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $enseignant = Enseignant::findOrFail($id);
            
            // Check if enseignant has related records
            $hasRelations = $enseignant->offresCoordonnees()->exists() ||
                           $enseignant->sujetsExamens()->exists() ||
                           $enseignant->grillesCorrection()->exists() ||
                           $enseignant->stagesEncadres()->exists() ||
                           $enseignant->correcteurs()->exists() ||
                           $enseignant->membresCommission()->exists();

            if ($hasRelations) {
                return redirect()->back()
                    ->withErrors(['error' => 'Impossible de supprimer cet enseignant car il est lié à d\'autres enregistrements.']);
            }

            $enseignant->delete();
            
            return redirect()->back()->with('success', 'Enseignant supprimé avec succès.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la suppression de l\'enseignant.']);
        }
    }

    /**
     * Bulk store enseignants from Excel import
     */
    protected function bulkStore(Request $request)
    {
        $enseignants = $request->input('enseignants', []);
        
        if (empty($enseignants)) {
            return redirect()->back()
                ->withErrors(['error' => 'Aucun enseignant à importer.']);
        }

        DB::beginTransaction();
        try {
            $created = 0;
            $skipped = 0;
            $errors = [];

            foreach ($enseignants as $enseignantData) {
                try {
                    // Validate each enseignant data
                    $validated = validator($enseignantData, [
                        'matricule' => 'required|string|max:20|unique:enseignants,matricule',
                        'nom' => 'required|string|max:50',
                        'prenom' => 'required|string|max:50',
                        'email' => 'required|email|max:100|unique:enseignants,email',
                        'grade' => 'nullable|string|max:50',
                        'departement' => 'nullable|string|max:100',
                    ])->validate();

                    // Check for duplicates
                    $exists = Enseignant::where('matricule', $validated['matricule'])
                        ->orWhere('email', $validated['email'])
                        ->exists();

                    if ($exists) {
                        $skipped++;
                        continue;
                    }

                    Enseignant::create($validated);
                    $created++;

                } catch (\Exception $e) {
                    $errors[] = "Erreur ligne: " . $e->getMessage();
                }
            }

            DB::commit();

            $message = "Import terminé: {$created} enseignants créés";
            if ($skipped > 0) {
                $message .= ", {$skipped} doublons ignorés";
            }
            if (!empty($errors)) {
                $message .= ". Erreurs: " . implode(', ', array_slice($errors, 0, 3));
            }

            return redirect()->route('configuration.enseignants.index')
                ->with('success', $message);

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Erreur lors de l\'import: ' . $e->getMessage()]);
        }
    }

    /**
     * Bulk destroy enseignants.
     */
    public function bulkDestroy(Request $request)
    {
        $ids = $request->input('ids', []);
        
        if (empty($ids)) {
            return redirect()->back()
                ->withErrors(['error' => 'Aucun enseignant sélectionné.']);
        }

        try {
            $deleted = 0;
            $failed = [];

            foreach ($ids as $id) {
                $enseignant = Enseignant::find($id);
                
                if (!$enseignant) {
                    $failed[] = "Enseignant {$id} non trouvé";
                    continue;
                }

                // Check if enseignant has related records
                $hasRelations = $enseignant->offresCoordonnees()->exists() ||
                               $enseignant->sujetsExamens()->exists() ||
                               $enseignant->grillesCorrection()->exists() ||
                               $enseignant->stagesEncadres()->exists() ||
                               $enseignant->correcteurs()->exists() ||
                               $enseignant->membresCommission()->exists();

                if ($hasRelations) {
                    $failed[] = "Enseignant {$enseignant->nom} {$enseignant->prenom} a des relations";
                    continue;
                }

                $enseignant->delete();
                $deleted++;
            }

            $message = "{$deleted} enseignants supprimés";
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