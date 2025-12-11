<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\InscriptionAdministrative;
use App\Models\Etudiant;
use App\Models\AnneeUniversitaire;
use App\Models\Niveau;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InscriptionAdministrativeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $inscriptions = InscriptionAdministrative::with([
            'niveau',
            'anneeUniversitaire',
            'etudiant',
            'section.filiere'
        ])->orderBy('created_at', 'desc')->get();

        $students = Etudiant::with('section.filiere')
            ->orderBy('nom')
            ->orderBy('prenom')
            ->get();

        $annees = AnneeUniversitaire::orderBy('annee_univ', 'desc')->get();
        $niveaux = Niveau::orderBy('ordre')->get();
        $sections = Section::with('filiere')->get();

        return Inertia::render("GestionsEtudiantes/InscriptionsAdministratives/Index", [
            "inscriptions" => $inscriptions,
            "students" => $students,
            "annees" => $annees,
            "niveaux" => $niveaux,
            "sections" => $sections,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Handle bulk import
        if ($request->has('inscriptions') && is_array($request->inscriptions)) {
            return $this->bulkStore($request);
        }

        // Single inscription
        $validated = $request->validate([
            'id_etudiant' => 'required|exists:etudiants,id_etudiant',
            'id_annee' => 'required|exists:annees_universitaires,id_annee',
            'id_niveau' => 'required|exists:niveaux,id_niveau',
            'id_section' => 'required|exists:sections,id_section',
            'date_inscription' => 'required|date',
            'statut' => 'required|string|max:30',
            'type_inscription' => ['required', Rule::in(['nouveau', 'redoublant', 'transfert'])],
        ]);

        // Check for duplicate inscription
        $exists = InscriptionAdministrative::where('id_etudiant', $validated['id_etudiant'])
            ->where('id_annee', $validated['id_annee'])
            ->where('id_niveau', $validated['id_niveau'])
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'id_etudiant' => 'Cet étudiant est déjà inscrit pour cette année et ce niveau.'
            ]);
        }

        InscriptionAdministrative::create($validated);

        return redirect()->route('inscriptions.administratives.index')
            ->with('success', 'Inscription administrative créée avec succès.');
    }

    /**
     * Bulk store inscriptions from Excel import
     */
    protected function bulkStore(Request $request)
    {
        $request->validate([
            'inscriptions' => 'required|array|min:1',
            'inscriptions.*.id_etudiant' => 'required|exists:etudiants,id_etudiant',
            'inscriptions.*.id_annee' => 'required|exists:annees_universitaires,id_annee',
            'inscriptions.*.id_niveau' => 'required|exists:niveaux,id_niveau',
            'inscriptions.*.id_section' => 'required|exists:sections,id_section',
            'inscriptions.*.date_inscription' => 'required|date',
            'inscriptions.*.statut' => 'required|string|max:30',
            'inscriptions.*.type_inscription' => ['required', Rule::in(['nouveau', 'redoublant', 'transfert'])],
        ]);

        $created = 0;
        $skipped = 0;

        DB::beginTransaction();
        try {
            foreach ($request->inscriptions as $inscriptionData) {
                // Check for duplicate
                $exists = InscriptionAdministrative::where('id_etudiant', $inscriptionData['id_etudiant'])
                    ->where('id_annee', $inscriptionData['id_annee'])
                    ->where('id_niveau', $inscriptionData['id_niveau'])
                    ->exists();

                if (!$exists) {
                    InscriptionAdministrative::create($inscriptionData);
                    $created++;
                } else {
                    $skipped++;
                }
            }
            DB::commit();

            return redirect()->route('inscriptions.administratives.index')
                ->with('success', "Import terminé: {$created} inscriptions créées, {$skipped} doublons ignorés.");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Erreur lors de l\'import: ' . $e->getMessage()]);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $inscription = InscriptionAdministrative::with([
            'niveau',
            'anneeUniversitaire',
            'etudiant',
            'section.filiere',
            'inscriptionsPedagogiques.module'
        ])->findOrFail($id);

        return Inertia::render("GestionsEtudiantes/InscriptionsAdministratives/Show", [
            "inscription" => $inscription,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $inscription = InscriptionAdministrative::findOrFail($id);

        $validated = $request->validate([
            'id_etudiant' => 'required|exists:etudiants,id_etudiant',
            'id_annee' => 'required|exists:annees_universitaires,id_annee',
            'id_niveau' => 'required|exists:niveaux,id_niveau',
            'id_section' => 'required|exists:sections,id_section',
            'date_inscription' => 'required|date',
            'statut' => 'required|string|max:30',
            'type_inscription' => ['required', Rule::in(['nouveau', 'redoublant', 'transfert'])],
        ]);

        // Check for duplicate (excluding current record)
        $exists = InscriptionAdministrative::where('id_etudiant', $validated['id_etudiant'])
            ->where('id_annee', $validated['id_annee'])
            ->where('id_niveau', $validated['id_niveau'])
            ->where('id_inscription_admin', '!=', $id)
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'id_etudiant' => 'Cet étudiant est déjà inscrit pour cette année et ce niveau.'
            ]);
        }

        $inscription->update($validated);

        return redirect()->route('inscriptions.administratives.index')
            ->with('success', 'Inscription administrative mise à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $inscription = InscriptionAdministrative::findOrFail($id);
        
        // Check if there are related pedagogical inscriptions
        if ($inscription->inscriptionsPedagogiques()->count() > 0) {
            return back()->withErrors([
                'error' => 'Impossible de supprimer cette inscription car elle a des inscriptions pédagogiques associées.'
            ]);
        }

        $inscription->delete();

        return redirect()->route('inscriptions.administratives.index')
            ->with('success', 'Inscription administrative supprimée avec succès.');
    }

    /**
     * Bulk delete inscriptions
     */
    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:inscriptions_administratives,id_inscription_admin'
        ]);

        $deleted = 0;
        $skipped = 0;

        foreach ($request->ids as $id) {
            $inscription = InscriptionAdministrative::find($id);
            if ($inscription && $inscription->inscriptionsPedagogiques()->count() === 0) {
                $inscription->delete();
                $deleted++;
            } else {
                $skipped++;
            }
        }

        return redirect()->route('inscriptions.administratives.index')
            ->with('success', "Suppression terminée: {$deleted} inscriptions supprimées, {$skipped} ignorées (inscriptions pédagogiques associées).");
    }
}
