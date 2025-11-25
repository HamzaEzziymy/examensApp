<?php

namespace App\Http\Controllers;

use App\Models\AnneeUniversitaire;
use App\Models\Enseignant;
use App\Models\Module;
use App\Models\OffreFormation;
use App\Models\Section;
use App\Models\Semestre;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OffreFormationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $offresFormation = OffreFormation::with([
            'module.elements',
            'semestre.niveau',
            'section.filiere',
            'anneeUniversitaire',
            'coordinateur'
        ])->get();

        $sections = Section::with('filiere')->get();
        // order semestre by code_niveau
        $Semestres = Semestre::with('niveau')->join('niveaux', 'semestres.id_niveau', '=', 'niveaux.id_niveau')
            ->orderBy('niveaux.code_niveau')
            ->orderBy('semestres.ordre')
            ->select('semestres.*')
            ->get();
        $modules = Module::orderBy('nom_module')->get();
        $cordinateurs = Enseignant::orderBy('nom')->get();
        $anneeUniversitaires = AnneeUniversitaire::orderByDesc('date_debut')->get();
        

        return Inertia::render('Academique/OffresFormation/Index',
        [
            'offresFormation' => $offresFormation,
            'sections' => $sections,
            'semestres' => $Semestres,
            'modules' => $modules,
            'coordinateurs' => $cordinateurs,
            'anneeUniversitaires' => $anneeUniversitaires,
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
        //rlation between module, semestre, section, annee universitaire, coordinateur
        $validated = $request->validate([
            'id_module' => ['required', 'exists:modules,id_module'],
            'id_semestre' => ['required', 'exists:semestres,id_semestre'],
            'id_section' => ['required', 'exists:sections,id_section'],
            'id_annee' => ['required', 'exists:annees_universitaires,id_annee'],
            'id_coordinateur' => ['required', 'exists:enseignants,id_enseignant'],
        ]);

        $offreFormation = OffreFormation::create($validated);
        return redirect()->route('academique.offres-formations.index');
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
        $offreFormation = OffreFormation::findOrFail($id);
        $validated = $request->validate([
            'id_module' => ['required', 'exists:modules,id_module'],
            'id_semestre' => ['required', 'exists:semestres,id_semestre'],
            'id_section' => ['required', 'exists:sections,id_section'],
            'id_annee' => ['required', 'exists:annees_universitaires,id_annee'],
            'id_coordinateur' => ['required', 'exists:enseignants,id_enseignant'],
        ]);

        $offreFormation->update($validated);
        return redirect()->route('academique.offres-formations.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $offreFormation = OffreFormation::findOrFail($id);
        $offreFormation->delete();
        return redirect()->route('academique.offres-formations.index');
    }
}
