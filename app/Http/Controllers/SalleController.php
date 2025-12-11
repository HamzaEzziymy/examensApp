<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Salle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class SalleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $salles = Salle::orderBy('code_salle')->get();
        
        return Inertia::render('Configuration/Salles/Index', [
            'salles' => $salles
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code_salle' => 'required|string|max:20|unique:salles,code_salle',
            'nom_salle' => 'required|string|max:100',
            'capacite' => 'required|integer|min:1|max:1000',
            'capacite_examens' => 'nullable|integer|min:1|max:1000',
            'batiment' => 'nullable|string|max:100',
            'est_disponible' => 'boolean',
            'specificites' => 'nullable|string|max:500',
        ], [
            'code_salle.required' => 'Le code de la salle est requis.',
            'code_salle.unique' => 'Ce code de salle existe déjà.',
            'nom_salle.required' => 'Le nom de la salle est requis.',
            'capacite.required' => 'La capacité est requise.',
            'capacite.min' => 'La capacité doit être d\'au moins 1 personne.',
            'capacite.max' => 'La capacité ne peut pas dépasser 1000 personnes.',
            'capacite_examens.min' => 'La capacité d\'examens doit être d\'au moins 1 personne.',
            'capacite_examens.max' => 'La capacité d\'examens ne peut pas dépasser 1000 personnes.',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            Salle::create([
                'code_salle' => $request->code_salle,
                'nom_salle' => $request->nom_salle,
                'capacite' => $request->capacite,
                'capacite_examens' => $request->capacite_examens,
                'batiment' => $request->batiment,
                'est_disponible' => $request->boolean('est_disponible', true),
                'specificites' => $request->specificites,
            ]);

            return redirect()->back()->with('success', 'Salle créée avec succès.');

        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la création de la salle.'])
                ->withInput();
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $salle = Salle::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'code_salle' => 'required|string|max:20|unique:salles,code_salle,' . $id . ',id_salle',
            'nom_salle' => 'required|string|max:100',
            'capacite' => 'required|integer|min:1|max:1000',
            'capacite_examens' => 'nullable|integer|min:1|max:1000',
            'batiment' => 'nullable|string|max:100',
            'est_disponible' => 'boolean',
            'specificites' => 'nullable|string|max:500',
        ], [
            'code_salle.required' => 'Le code de la salle est requis.',
            'code_salle.unique' => 'Ce code de salle existe déjà.',
            'nom_salle.required' => 'Le nom de la salle est requis.',
            'capacite.required' => 'La capacité est requise.',
            'capacite.min' => 'La capacité doit être d\'au moins 1 personne.',
            'capacite.max' => 'La capacité ne peut pas dépasser 1000 personnes.',
            'capacite_examens.min' => 'La capacité d\'examens doit être d\'au moins 1 personne.',
            'capacite_examens.max' => 'La capacité d\'examens ne peut pas dépasser 1000 personnes.',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            $salle->update([
                'code_salle' => $request->code_salle,
                'nom_salle' => $request->nom_salle,
                'capacite' => $request->capacite,
                'capacite_examens' => $request->capacite_examens,
                'batiment' => $request->batiment,
                'est_disponible' => $request->boolean('est_disponible', true),
                'specificites' => $request->specificites,
            ]);

            return redirect()->back()->with('success', 'Salle mise à jour avec succès.');

        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la mise à jour de la salle.']);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $salle = Salle::findOrFail($id);
            
            // Check if salle has related examens
            if ($salle->examens()->exists()) {
                return redirect()->back()
                    ->withErrors(['error' => 'Impossible de supprimer cette salle car elle est utilisée dans des examens.']);
            }
            
            $salle->delete();
            
            return redirect()->back()->with('success', 'Salle supprimée avec succès.');
            
        } catch (\Exception $e) {
            return redirect()->back()
                ->withErrors(['error' => 'Erreur lors de la suppression de la salle.']);
        }
    }

    /**
     * Bulk destroy salles.
     */
    public function bulkDestroy(Request $request)
    {
        $ids = $request->input('ids', []);
        
        if (empty($ids)) {
            return redirect()->back()
                ->withErrors(['error' => 'Aucune salle sélectionnée.']);
        }

        try {
            $deleted = 0;
            $failed = [];

            foreach ($ids as $id) {
                $salle = Salle::find($id);
                
                if (!$salle) {
                    $failed[] = "Salle {$id} non trouvée";
                    continue;
                }

                // Check for related examens
                if ($salle->examens()->exists()) {
                    $failed[] = "Salle {$salle->code_salle} utilisée dans des examens";
                    continue;
                }

                $salle->delete();
                $deleted++;
            }

            $message = "{$deleted} salles supprimées";
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
