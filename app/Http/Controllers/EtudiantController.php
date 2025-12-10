<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Etudiant;
use App\Models\Filiere;
use App\Models\Section;
use App\Models\UserFiliereAnnee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class EtudiantController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Get user's selected filiere and year
        $userFiliereAnnee = auth()->user()->userFiliereAnnees()->first();
        $selectedFiliere = $userFiliereAnnee ? $userFiliereAnnee->id_filiere : null;
        
        // Build query for students
        $studentsQuery = Etudiant::with('section.filiere')
            ->orderBy('nom')
            ->orderBy('prenom');
        
        // Apply filiere filter if a specific filiere is selected (not "all")
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $studentsQuery->whereHas('section.filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        
        $students = $studentsQuery->get();

        // Filter sections based on selected filiere
        $sectionsQuery = Section::with('filiere');
        if ($selectedFiliere && $selectedFiliere !== 'all') {
            $sectionsQuery->whereHas('filiere', function ($query) use ($selectedFiliere) {
                $query->where('id_filiere', $selectedFiliere);
            });
        }
        $sections = $sectionsQuery->get();
        
        return Inertia::render('GestionsEtudiantes/Etudiantes/Index', [
            'students' => $students,
            'sections' => $sections
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $rules = [
            'cne' => 'required|string|max:20|unique:etudiants,cne',
            'nom' => 'required|string|max:50',
            'prenom' => 'required|string|max:50',
            'mail_academique' => 'required|email|max:100|unique:etudiants,mail_academique',
            'mail_personnel' => 'nullable|email|max:100|unique:etudiants,mail_personnel',
            'date_naissance' => 'nullable|date',
            'telephone' => 'nullable|string|max:20',
            'url_photo' => 'nullable|string|max:255',
            'id_section' => 'nullable|exists:sections,id_section',
        ];

        // Handle bulk import
        if ($request->has('students') && is_array($request->students)) {
            return $this->bulkStore($request);
        }

        // Single student creation
        $validated = $request->validate($rules);
        Etudiant::create($validated);

        return redirect()->route('personnes.etudiants.index');
    }

    /**
     * Bulk store students from Excel import
     */
    protected function bulkStore(Request $request)
    {
        $studentsData = $request->students;
        $created = 0;
        $skipped = 0;
        $errors = [];

        DB::beginTransaction();
            foreach ($studentsData as $index => $data) {
                $validator = Validator::make($data, [
                    'cne' => 'required|string|max:20|unique:etudiants,cne',
                    'nom' => 'required|string|max:50',
                    'prenom' => 'required|string|max:50',
                    'mail_academique' => 'required|email|max:100|unique:etudiants,mail_academique',
                    'mail_personnel' => 'nullable|email|max:100|unique:etudiants,mail_personnel',
                    'date_naissance' => 'nullable|date',
                    'telephone' => 'nullable|string|max:20',
                    'url_photo' => 'nullable|string|max:255',
                    'id_section' => 'nullable|exists:sections,id_section',
                ]);

                if ($validator->fails()) {
                    $skipped++;
                    $errors[] = [
                        'row' => $index + 1,
                        'cne' => $data['cne'] ?? '',
                        'errors' => $validator->errors()->all()
                    ];
                }else {
                    // Create student
                    Etudiant::create($validator->validated());
                    $created++;
                }
            }
        DB::commit();
        return redirect()->route('inscriptions.etudiants.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $student = Etudiant::with([
            'section.filiere',
            'inscriptionsAdministratives.anneeUniversitaire',
            'inscriptionsAdministratives.niveau',
            'inscriptionsPedagogiques.module'
        ])->findOrFail($id);

        return Inertia::render('GestionsEtudiantes/Etudiantes/Show', [
            'student' => $student,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $student = Etudiant::findOrFail($id);

        $validated = $request->validate([
            'cne' => ['required', 'string', 'max:20', Rule::unique('etudiants', 'cne')->ignore($id, 'id_etudiant')],
            'nom' => 'required|string|max:50',
            'prenom' => 'required|string|max:50',
            'mail_academique' => ['required', 'email', 'max:100', Rule::unique('etudiants', 'mail_academique')->ignore($id, 'id_etudiant')],
            'mail_personnel' => ['nullable', 'email', 'max:100', Rule::unique('etudiants', 'mail_personnel')->ignore($id, 'id_etudiant')],
            'date_naissance' => 'nullable|date',
            'telephone' => 'nullable|string|max:20',
            'url_photo' => 'nullable|string|max:255',
            'id_section' => 'nullable|exists:sections,id_section',
        ]);

        $student->update($validated);

        return redirect()->route('personnes.etudiants.index')
            ->with('success', 'Étudiant mis à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $student = Etudiant::findOrFail($id);

        // Check if student has inscriptions
        if ($student->inscriptionsAdministratives()->count() > 0) {
            return back()->withErrors([
                'error' => 'Impossible de supprimer cet étudiant car il a des inscriptions associées.'
            ]);
        }

        $student->delete();

        return redirect()->route('personnes.etudiants.index')
            ->with('success', 'Étudiant supprimé avec succès.');
    }

    /**
     * Bulk delete students
     */
    public function bulkDestroy(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:etudiants,id_etudiant'
        ]);

        $deleted = 0;
        $skipped = 0;

        foreach ($request->ids as $id) {
            $student = Etudiant::find($id);
            if ($student && $student->inscriptionsAdministratives()->count() === 0) {
                $student->delete();
                $deleted++;
            } else {
                $skipped++;
            }
        }

        return redirect()->route('personnes.etudiants.index')
            ->with('success', "Suppression terminée: {$deleted} étudiants supprimés, {$skipped} ignorés (inscriptions associées).");
    }
}
