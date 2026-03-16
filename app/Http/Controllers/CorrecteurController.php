<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Correcteur;
use App\Models\Examen;
use App\Models\Enseignant;
use App\Models\ElementModule;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CorrecteurController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $correcteurs = Correcteur::with(['enseignant', 'examen.module.elements', 'examen.module.offresFormation.section', 'element'])
            ->paginate(10);
        
        $examens = Examen::with(['module.elements', 'module.offresFormation.section'])->get();
        $enseignants = Enseignant::all();
        $elements = ElementModule::all();

        return Inertia::render('correction/Correcteurs/Index', [
            'correcteurs' => $correcteurs,
            'examens' => $examens,
            'enseignants' => $enseignants,
            'elements' => $elements,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_examen' => 'required|exists:examens,id_examen',
            'id_enseignant' => 'required|exists:enseignants,id_enseignant',
            'id_element' => 'nullable|exists:elements_module,id_element',
            'nombre_copies' => 'required|integer|min:1',
            'date_attribution' => 'nullable|date',
            'date_limite_correction' => 'required|date',
            'statut' => 'required|in:Attribue,En cours,Termine',
        ]);

        // Remove id_element if column doesn't exist in database
        if (isset($validated['id_element'])) {
            try {
                // Try to check if column exists
                \DB::select("SHOW COLUMNS FROM correcteurs LIKE 'id_element'");
            } catch (\Exception $e) {
                unset($validated['id_element']);
            }
            
            // Alternative check: if column doesn't exist, remove it
            $columns = \Schema::getColumnListing('correcteurs');
            if (!in_array('id_element', $columns)) {
                unset($validated['id_element']);
            }
        }

        Correcteur::create($validated);

        return redirect()->route('correction.correcteurs.index')
            ->with('success', 'Correcteur ajouté avec succès');
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
        $correcteur = Correcteur::findOrFail($id);

        $validated = $request->validate([
            'id_examen' => 'required|exists:examens,id_examen',
            'id_enseignant' => 'required|exists:enseignants,id_enseignant',
            'id_element' => 'nullable|exists:elements_module,id_element',
            'nombre_copies' => 'required|integer|min:1',
            'date_attribution' => 'nullable|date',
            'date_limite_correction' => 'required|date',
            'statut' => 'required|in:Attribue,En cours,Termine',
        ]);

        // Remove id_element if column doesn't exist in database
        if (isset($validated['id_element'])) {
            $columns = \Schema::getColumnListing('correcteurs');
            if (!in_array('id_element', $columns)) {
                unset($validated['id_element']);
            }
        }

        $correcteur->update($validated);

        return redirect()->route('correction.correcteurs.index')
            ->with('success', 'Correcteur modifié avec succès');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $correcteur = Correcteur::findOrFail($id);
        $correcteur->delete();

        return redirect()->route('correction.correcteurs.index')
            ->with('success', 'Correcteur supprimé avec succès');
    }
}
