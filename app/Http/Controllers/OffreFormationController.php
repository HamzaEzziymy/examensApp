<?php

namespace App\Http\Controllers;

use App\Models\AnneeUniversitaire;
use App\Models\Enseignant;
use App\Models\Module;
use App\Models\OffreFormation;
use App\Models\Section;
use App\Models\Semestre;
use App\Models\UserFiliereAnnee;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OffreFormationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Get user's selected year and filière from Years_Sectors_Selecters
        $userFiliereAnnee = auth()->user()->userFiliereAnnees()->first();
        $selectedAnnee = $userFiliereAnnee ? $userFiliereAnnee->id_annee : null;
        $selectedFiliere = $userFiliereAnnee ? $userFiliereAnnee->id_filiere : null;

        // Get filter parameters from request
        $search = $request->input('search', '');
        $filterAnnee = $request->input('annee', '');
        $filterSection = $request->input('section', '');
        $filterSemestre = $request->input('semestre', '');
        $perPage = $request->input('per_page', 25);

        // Build query for offres formation with backend filtering
        $offresQuery = OffreFormation::with([
            'module.elements',
            'semestre.niveau',
            'section.filiere',
            'anneeUniversitaire',
            'coordinateur'
        ]);

        // Apply user's year filter if a specific year is selected (default context)
        if ($selectedAnnee && $selectedAnnee !== 'all' && empty($filterAnnee)) {
            $offresQuery->where('id_annee', $selectedAnnee);
        }

        // Apply user's filière filter if a specific filière is selected
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $offresQuery->whereHas('section', function ($q) use ($selectedFiliere) {
                $q->where('id_filiere', $selectedFiliere);
            });
        }

        // Apply search filter (module name, section name, coordinateur name)
        if (!empty($search)) {
            $offresQuery->where(function ($query) use ($search) {
                $query->whereHas('module', function ($q) use ($search) {
                    $q->where('nom_module', 'like', "%{$search}%")
                      ->orWhere('code_module', 'like', "%{$search}%");
                })
                ->orWhereHas('section', function ($q) use ($search) {
                    $q->where('nom_section', 'like', "%{$search}%");
                })
                ->orWhereHas('coordinateur', function ($q) use ($search) {
                    $q->where('nom', 'like', "%{$search}%")
                      ->orWhere('prenom', 'like', "%{$search}%");
                });
            });
        }

        // Apply année filter
        if (!empty($filterAnnee)) {
            $offresQuery->where('id_annee', $filterAnnee);
        }

        // Apply section filter (removed - now depends on Years_Sectors_Selecters filière)
        // if (!empty($filterSection)) {
        //     $offresQuery->where('id_section', $filterSection);
        // }

        // Apply semestre filter
        if (!empty($filterSemestre)) {
            $offresQuery->where('id_semestre', $filterSemestre);
        }

        // Order and paginate
        $offresQuery->orderBy('id_annee', 'desc')
                    ->orderBy('id_semestre')
                    ->orderBy('id_section');

        // Get total count before pagination
        $totalCount = $offresQuery->count();

        // Paginate results
        $offresFormation = $offresQuery->paginate($perPage)->withQueryString();

        // Get all sections (no filiere filter)
        $sections = Section::with('filiere')->get();

        // Order semestre by code_niveau
        $Semestres = Semestre::with('niveau')->join('niveaux', 'semestres.id_niveau', '=', 'niveaux.id_niveau')
            ->orderBy('niveaux.code_niveau')
            ->orderBy('semestres.ordre')
            ->select('semestres.*')
            ->get();
            
        $modules = Module::orderBy('nom_module')->get();
        $cordinateurs = Enseignant::orderBy('nom')->get();
        
        // Get all years (no filtering)
        $anneeUniversitaires = AnneeUniversitaire::orderByDesc('date_debut')->get();


        return Inertia::render(
            'Academique/OffresFormation/Index',
            [
                'offresFormation' => $offresFormation,
                'sections' => $sections,
                'semestres' => $Semestres,
                'modules' => $modules,
                'coordinateurs' => $cordinateurs,
                'anneeUniversitaires' => $anneeUniversitaires,
                'filters' => [
                    'search' => $search,
                    'annee' => $filterAnnee,
                    'section' => $filterSection,
                    'semestre' => $filterSemestre,
                    'per_page' => $perPage,
                ],
                'totalCount' => $totalCount,
            ]
        );
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
            'id_coordinateur' => ['nullable', 'exists:enseignants,id_enseignant'],
            'nom_affiche' => ['nullable', 'string', 'max:255'],
        ]);

        // Check unique combo (module + semestre + section + annee)
        $exists = OffreFormation::where('id_module', $validated['id_module'])
            ->where('id_semestre', $validated['id_semestre'])
            ->where('id_section', $validated['id_section'])
            ->where('id_annee', $validated['id_annee'])
            ->exists();

        if ($exists) {
            return redirect()->back()
                ->withErrors(['id_module' => 'Cette offre (module + section + année) existe déjà.'])
                ->withInput();
        }

        $offreFormation = OffreFormation::create($validated);
        return redirect()->back()->with('success', 'Offre de formation créée avec succès.');
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
            'id_coordinateur' => ['nullable', 'exists:enseignants,id_enseignant'],
            'nom_affiche' => ['nullable', 'string', 'max:255'],
        ]);

        // Check unique combo excluding current record
        $exists = OffreFormation::where('id_module', $validated['id_module'])
            ->where('id_semestre', $validated['id_semestre'])
            ->where('id_section', $validated['id_section'])
            ->where('id_annee', $validated['id_annee'])
            ->where('id_offre', '!=', $id)
            ->exists();

        if ($exists) {
            return redirect()->back()
                ->withErrors(['id_module' => 'Cette offre (module + section + année) existe déjà.'])
                ->withInput();
        }

        $offreFormation->update($validated);
        return redirect()->back()->with('success', 'Offre de formation mise à jour avec succès.');
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
