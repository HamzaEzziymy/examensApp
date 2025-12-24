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
        
        // Get niveaux and academic years for administrative inscription
        $niveaux = \App\Models\Niveau::orderBy('ordre')->get();
        $annees = \App\Models\AnneeUniversitaire::orderBy('annee_univ', 'desc')->get();
        
        return Inertia::render('GestionsEtudiantes/Etudiantes/Index', [
            'students' => $students,
            'sections' => $sections,
            'niveaux' => $niveaux,
            'annees' => $annees
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Only validate the 4 core required fields: cne, nom, prenom, mail_academique
        $rules = [
            'cne' => 'required|string|min:2|max:20|unique:etudiants,cne',
            'nom' => 'required|string|min:2|max:50',
            'prenom' => 'required|string|min:2|max:50',
            'mail_academique' => 'required|email|max:100|unique:etudiants,mail_academique',
            // All other fields are optional but must respect database constraints
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
        try {
            \Log::info('=== DEBUGGING SINGLE STUDENT CREATION ===', [
                'request_data' => $request->all(),
                'validation_rules' => $rules
            ]);
            
            // Add validation for administrative inscription fields if provided
            if ($request->has('id_niveau') && $request->has('id_annee')) {
                $rules['id_niveau'] = 'required|exists:niveaux,id_niveau';
                $rules['id_annee'] = 'required|exists:annees_universitaires,id_annee';
            }
            
            $validated = $request->validate($rules);
            
            \Log::info('Validation passed, creating student', [
                'validated_data' => $validated
            ]);
            
            // Create the student
            $studentData = array_intersect_key($validated, array_flip([
                'cne', 'nom', 'prenom', 'mail_academique', 'mail_personnel', 
                'date_naissance', 'telephone', 'url_photo', 'id_section'
            ]));
            $student = Etudiant::create($studentData);
            
            \Log::info('Student created successfully', [
                'student_id' => $student->id_etudiant,
                'student_data' => $student->toArray()
            ]);
            
            // Create administrative inscription if niveau and annee are provided
            if (isset($validated['id_niveau']) && isset($validated['id_annee'])) {
                $this->createAdministrativeInscription($student, $validated);
            }
            
            return redirect()->route('inscriptions.etudiants.index')
                ->with('success', 'Étudiant ajouté avec succès' . 
                    (isset($validated['id_niveau']) ? ' et inscription administrative créée automatiquement' : ''));
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation failed for single student', [
                'errors' => $e->errors(),
                'data' => $request->all()
            ]);
            
            return redirect()->route('inscriptions.etudiants.index')
                ->withErrors($e->errors());
        } catch (\Exception $e) {
            \Log::error('Single student creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => $request->all()
            ]);
            
            return redirect()->route('inscriptions.etudiants.index')
                ->withErrors(['error' => 'Erreur lors de la création: ' . $e->getMessage()]);
        }
    }

    /**
     * Bulk store students from Excel import
     * 
     * Returns structured response with:
     * - success: boolean indicating overall success
     * - message: human-readable summary
     * - created: count of successfully created students
     * - skipped: count of students with errors
     * - errors: array of ImportError objects with row, student data, and error messages
     */
    protected function bulkStore(Request $request)
    {
        $studentsData = $request->students;
        $created = 0;
        $skipped = 0;
        $errors = [];
        $totalRows = count($studentsData);

        \Log::info('Bulk import started', [
            'total_students' => $totalRows,
            'first_student' => $studentsData[0] ?? null
        ]);

        // First pass: collect all validation errors before any database operations
        $validatedStudents = [];
        foreach ($studentsData as $index => $data) {
            // Validate the 4 core required fields: cne, nom, prenom, mail_academique
            // mail_academique is strictly required with no auto-generation fallback
            $validator = Validator::make($data, [
                'cne' => 'required|string|min:2|max:20',
                'nom' => 'required|string|min:2|max:50',
                'prenom' => 'required|string|min:2|max:50',
                'mail_academique' => 'required|email|max:100',
                // All other fields are optional but must respect database constraints
                'mail_personnel' => 'nullable|email|max:100',
                'date_naissance' => 'nullable|date',
                'telephone' => 'nullable|string|max:20',
                'url_photo' => 'nullable|string|max:255',
                'id_section' => 'nullable|integer|exists:sections,id_section',
            ], [
                'cne.required' => 'CNE requis',
                'nom.required' => 'Nom requis',
                'prenom.required' => 'Prénom requis',
                'mail_academique.required' => 'Email académique requis',
                'mail_academique.email' => 'Format email invalide',
            ]);

            if ($validator->fails()) {
                $skipped++;
                $errors[] = [
                    'row' => $index + 2, // Excel row number (starting from 2)
                    'cne' => $data['cne'] ?? '',
                    'nom' => $data['nom'] ?? '',
                    'prenom' => $data['prenom'] ?? '',
                    'mail_academique' => $data['mail_academique'] ?? '',
                    'errors' => $validator->errors()->all()
                ];
            } else {
                $validatedStudents[] = [
                    'index' => $index,
                    'data' => $validator->validated(),
                    'original' => $data
                ];
            }
        }

        // Check for unique constraint violations (CNE and email) against database
        foreach ($validatedStudents as $key => $item) {
            $uniqueErrors = [];
            $data = $item['data'];
            $original = $item['original'];
            
            // Check CNE uniqueness
            if (Etudiant::where('cne', $data['cne'])->exists()) {
                $uniqueErrors[] = 'CNE existe déjà dans la base de données';
            }
            
            // Check email uniqueness
            if (Etudiant::where('mail_academique', $data['mail_academique'])->exists()) {
                $uniqueErrors[] = 'Email académique existe déjà dans la base de données';
            }
            
            // Check mail_personnel uniqueness if provided
            if (!empty($data['mail_personnel']) && Etudiant::where('mail_personnel', $data['mail_personnel'])->exists()) {
                $uniqueErrors[] = 'Email personnel existe déjà dans la base de données';
            }
            
            if (!empty($uniqueErrors)) {
                $skipped++;
                $errors[] = [
                    'row' => $item['index'] + 2,
                    'cne' => $data['cne'] ?? '',
                    'nom' => $data['nom'] ?? '',
                    'prenom' => $data['prenom'] ?? '',
                    'mail_academique' => $data['mail_academique'] ?? '',
                    'errors' => $uniqueErrors
                ];
                unset($validatedStudents[$key]);
            }
        }

        // Re-index array after removing invalid entries
        $validatedStudents = array_values($validatedStudents);

        // Second pass: insert valid students within a transaction
        DB::beginTransaction();
        try {
            foreach ($validatedStudents as $item) {
                $studentData = $item['data'];
                
                // Handle empty strings for nullable fields
                foreach (['mail_personnel', 'date_naissance', 'telephone', 'url_photo', 'id_section'] as $field) {
                    if (isset($studentData[$field]) && $studentData[$field] === '') {
                        $studentData[$field] = null;
                    }
                }
                
                try {
                    Etudiant::create($studentData);
                    $created++;
                } catch (\Exception $e) {
                    $skipped++;
                    $errors[] = [
                        'row' => $item['index'] + 2,
                        'cne' => $studentData['cne'] ?? '',
                        'nom' => $studentData['nom'] ?? '',
                        'prenom' => $studentData['prenom'] ?? '',
                        'mail_academique' => $studentData['mail_academique'] ?? '',
                        'errors' => ['Erreur de base de données: ' . $e->getMessage()]
                    ];
                }
            }
            
            DB::commit();

            \Log::info('Bulk import completed', [
                'created' => $created,
                'skipped' => $skipped,
                'errors_count' => count($errors),
                'errors' => $errors
            ]);

            // Build structured response message
            $message = $this->buildImportMessage($created, $skipped, $totalRows);

            // Return appropriate response based on results
            if (empty($errors)) {
                // All students imported successfully
                // Check if request expects JSON (AJAX request)
                if ($request->expectsJson() || $request->ajax()) {
                    return response()->json([
                        'success' => true,
                        'message' => $message,
                        'created' => $created,
                        'skipped' => $skipped,
                        'errors' => []
                    ]);
                }
                
                return redirect()->route('inscriptions.etudiants.index')
                    ->with('success', $message)
                    ->with('import_result', [
                        'success' => true,
                        'message' => $message,
                        'created' => $created,
                        'skipped' => $skipped,
                        'errors' => []
                    ]);
            } else {
                // Some students had errors - return structured error response
                // Check if request expects JSON (AJAX request)
                if ($request->expectsJson() || $request->ajax()) {
                    return response()->json([
                        'success' => $created > 0,
                        'message' => $message,
                        'created' => $created,
                        'skipped' => $skipped,
                        'import_errors' => $errors
                    ], $created > 0 ? 200 : 422);
                }
                
                return redirect()->route('inscriptions.etudiants.index')
                    ->with('import_partial', $message)
                    ->with('import_errors', $errors)
                    ->with('import_result', [
                        'success' => $created > 0,
                        'message' => $message,
                        'created' => $created,
                        'skipped' => $skipped,
                        'errors' => $errors
                    ]);
            }

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Bulk import failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Check if request expects JSON (AJAX request)
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur lors de l\'import: ' . $e->getMessage(),
                    'created' => 0,
                    'skipped' => $totalRows,
                    'import_errors' => []
                ], 500);
            }
            
            return redirect()->route('inscriptions.etudiants.index')
                ->withErrors(['import' => 'Erreur lors de l\'import: ' . $e->getMessage()])
                ->with('import_result', [
                    'success' => false,
                    'message' => 'Erreur lors de l\'import: ' . $e->getMessage(),
                    'created' => 0,
                    'skipped' => $totalRows,
                    'errors' => []
                ]);
        }
    }

    /**
     * Build human-readable import result message
     */
    private function buildImportMessage(int $created, int $skipped, int $total): string
    {
        if ($skipped === 0) {
            return "Import réussi: {$created} étudiants créés avec succès";
        } elseif ($created === 0) {
            return "Import échoué: {$skipped} étudiants avec erreurs sur {$total}";
        } else {
            return "Import partiel: {$created} étudiants créés, {$skipped} avec erreurs";
        }
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
            'inscriptionsPedagogiques.offreFormation.module'
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

        // Only validate the 4 core required fields: cne, nom, prenom, mail_academique
        $validated = $request->validate([
            'cne' => ['required', 'string', 'min:2', 'max:20', Rule::unique('etudiants', 'cne')->ignore($id, 'id_etudiant')],
            'nom' => 'required|string|min:2|max:50',
            'prenom' => 'required|string|min:2|max:50',
            'mail_academique' => ['required', 'email', 'max:100', Rule::unique('etudiants', 'mail_academique')->ignore($id, 'id_etudiant')],
            // All other fields are optional but must respect database constraints
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

    /**
     * Create administrative inscription and automatic pedagogical inscriptions
     */
    private function createAdministrativeInscription(Etudiant $student, array $validated)
    {
        try {
            // Check if administrative inscription already exists
            $exists = \App\Models\InscriptionAdministrative::where('id_etudiant', $student->id_etudiant)
                ->where('id_annee', $validated['id_annee'])
                ->where('id_niveau', $validated['id_niveau'])
                ->exists();

            if ($exists) {
                \Log::warning('Administrative inscription already exists', [
                    'student_id' => $student->id_etudiant,
                    'annee_id' => $validated['id_annee'],
                    'niveau_id' => $validated['id_niveau']
                ]);
                return;
            }

            // Create administrative inscription
            $inscriptionAdmin = \App\Models\InscriptionAdministrative::create([
                'id_etudiant' => $student->id_etudiant,
                'id_annee' => $validated['id_annee'],
                'id_niveau' => $validated['id_niveau'],
                'id_section' => $validated['id_section'],
                'date_inscription' => now()->format('Y-m-d'),
                'statut' => 'Inscrit',
                'type_inscription' => 'nouveau'
            ]);

            \Log::info('Administrative inscription created', [
                'inscription_id' => $inscriptionAdmin->id_inscription_admin,
                'student_id' => $student->id_etudiant
            ]);

            // Create automatic pedagogical inscriptions
            $this->createAutomaticPedagogicalInscriptions($inscriptionAdmin);

        } catch (\Exception $e) {
            \Log::error('Failed to create administrative inscription', [
                'student_id' => $student->id_etudiant,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Automatically create pedagogical inscriptions for all course offerings
     * that match the student's level and section
     */
    private function createAutomaticPedagogicalInscriptions(\App\Models\InscriptionAdministrative $inscriptionAdmin)
    {
        try {
            // Get all course offerings (offre_formation) that match the student's level AND section
            $offresFormation = \App\Models\OffreFormation::with(['semestre.niveau', 'section', 'module'])
                ->whereHas('semestre.niveau', function ($query) use ($inscriptionAdmin) {
                    $query->where('id_niveau', $inscriptionAdmin->id_niveau);
                })
                ->where('id_section', $inscriptionAdmin->id_section)
                ->where('id_annee', $inscriptionAdmin->id_annee) // Also match the academic year
                ->get();

            $created = 0;
            foreach ($offresFormation as $offre) {
                // Check if pedagogical inscription already exists
                $exists = \App\Models\InscriptionPedagogique::where('id_inscription_admin', $inscriptionAdmin->id_inscription_admin)
                    ->where('id_offre', $offre->id_offre)
                    ->exists();

                if (!$exists) {
                    \App\Models\InscriptionPedagogique::create([
                        'id_inscription_admin' => $inscriptionAdmin->id_inscription_admin,
                        'id_offre' => $offre->id_offre,
                        'type_inscription' => 'Normal',
                        'credits_acquis' => 0,
                    ]);
                    $created++;
                }
            }

            // Log the automatic creation for debugging
            \Log::info("Automatic pedagogical inscriptions created from student creation", [
                'inscription_admin_id' => $inscriptionAdmin->id_inscription_admin,
                'student_id' => $inscriptionAdmin->id_etudiant,
                'level_id' => $inscriptionAdmin->id_niveau,
                'section_id' => $inscriptionAdmin->id_section,
                'academic_year_id' => $inscriptionAdmin->id_annee,
                'created_count' => $created,
                'total_offers' => $offresFormation->count(),
                'offers_details' => $offresFormation->map(function($offre) {
                    return [
                        'id_offre' => $offre->id_offre,
                        'module_name' => $offre->module->nom_module ?? 'N/A',
                        'semestre' => $offre->semestre->nom_semestre ?? 'N/A',
                        'section' => $offre->section->nom_section ?? 'N/A'
                    ];
                })
            ]);

        } catch (\Exception $e) {
            // Log error but don't fail the administrative inscription
            \Log::error("Failed to create automatic pedagogical inscriptions from student creation", [
                'inscription_admin_id' => $inscriptionAdmin->id_inscription_admin,
                'error' => $e->getMessage()
            ]);
        }
    }
}
