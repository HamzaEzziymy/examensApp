<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\Anonymat;
use App\Models\Examen;
use App\Models\Correcteur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class NoteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Paginate notes with relationships
        $notes = Note::with([
                'anonymat.inscriptionPedagogique.inscriptionAdministrative.etudiant',
                'examen.module.offresFormation.section',
                'examen.module.elements',
                'examen.element',
                'examen.sessionExamen',
                'element',
                'enseignant'
            ])
            ->latest('date_saisie')
            ->paginate(25);
        
        // Load examens with relationships
        $examens = Examen::with(['module.offresFormation.section', 'module.elements', 'element', 'sessionExamen'])
            ->latest('date_examen')
            ->limit(200)
            ->get();

        // Load enseignants for dropdown
        $enseignants = \App\Models\Enseignant::select('id_enseignant', 'nom', 'prenom')->get();

        // Empty arrays - will be loaded via AJAX when exam is selected
        $anonymats = [];

        return Inertia::render('correction/Notes/Index', [
            'notes' => $notes,
            'examens' => $examens,
            'anonymats' => $anonymats,
            'enseignants' => $enseignants,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_anonymat' => 'required|exists:anonymat,id_anonymat',
            'id_examen' => 'required|exists:examens,id_examen',
            'id_element' => 'nullable|exists:elements_module,id_element',
            'id_enseignant' => 'nullable|exists:enseignants,id_enseignant',
            'note' => ['required', function ($attribute, $value, $fail) use ($request) {
                // Allow special values
                if (in_array(strtoupper($value), ['ABS', 'CAP'])) {
                    return;
                }
                // Otherwise must be numeric
                if (!is_numeric($value)) {
                    $fail('La note doit être un nombre ou ABS/CAP.');
                    return;
                }
                // Check range
                $noteSur = $request->input('note_sur', 20);
                if ($value < 0 || $value > $noteSur) {
                    $fail("La note doit être entre 0 et {$noteSur}.");
                }
            }],
            'note_sur' => 'required|numeric|min:0|max:100',
            'commentaire' => 'nullable|string',
        ]);

        // Convert note to uppercase if it's ABS or CAP
        if (in_array(strtoupper($validated['note']), ['ABS', 'CAP'])) {
            $validated['note'] = strtoupper($validated['note']);
        }

        Note::create($validated);

        return redirect()->route('correction.notes.index')
            ->with('success', 'Note ajoutée avec succès');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $note = Note::findOrFail($id);

        $validated = $request->validate([
            'id_anonymat' => 'required|exists:anonymat,id_anonymat',
            'id_examen' => 'required|exists:examens,id_examen',
            'id_element' => 'nullable|exists:elements_module,id_element',
            'id_enseignant' => 'nullable|exists:enseignants,id_enseignant',
            'note' => ['required', function ($attribute, $value, $fail) use ($request) {
                // Allow special values
                if (in_array(strtoupper($value), ['ABS', 'CAP'])) {
                    return;
                }
                // Otherwise must be numeric
                if (!is_numeric($value)) {
                    $fail('La note doit être un nombre ou ABS/CAP.');
                    return;
                }
                // Check range
                $noteSur = $request->input('note_sur', 20);
                if ($value < 0 || $value > $noteSur) {
                    $fail("La note doit être entre 0 et {$noteSur}.");
                }
            }],
            'note_sur' => 'required|numeric|min:0|max:100',
            'commentaire' => 'nullable|string',
        ]);

        // Convert note to uppercase if it's ABS or CAP
        if (in_array(strtoupper($validated['note']), ['ABS', 'CAP'])) {
            $validated['note'] = strtoupper($validated['note']);
        }

        $note->update($validated);

        return redirect()->route('correction.notes.index')
            ->with('success', 'Note modifiée avec succès');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $note = Note::findOrFail($id);
        $note->delete();

        return redirect()->route('correction.notes.index')
            ->with('success', 'Note supprimée avec succès');
    }

    /**
     * Import notes from file.
     */
    public function import(Request $request)
    {
        // Handle bulk import
        if ($request->has('notes') && is_array($request->notes)) {
            return $this->bulkStore($request);
        }

        return redirect()->route('correction.notes.index')
            ->with('success', 'Import en cours de développement');
    }

    /**
     * Bulk store notes from Excel import
     */
    protected function bulkStore(Request $request)
    {
        $request->validate([
            'notes' => 'required|array|min:1',
            'notes.*.id_anonymat' => 'required|exists:anonymat,id_anonymat',
            'notes.*.id_examen' => 'required|exists:examens,id_examen',
            'notes.*.id_element' => 'nullable|exists:elements_module,id_element',
            'notes.*.id_enseignant' => 'nullable|exists:enseignants,id_enseignant',
            'notes.*.note' => ['required', function ($attribute, $value, $fail) use ($request) {
                // Allow special values
                if (in_array(strtoupper($value), ['ABS', 'CAP'])) {
                    return;
                }
                // Otherwise must be numeric
                if (!is_numeric($value)) {
                    $fail('La note doit être un nombre ou ABS/CAP.');
                    return;
                }
                // Check range - extract note_sur from the same note item
                $noteIndex = explode('.', $attribute)[1]; // Get index from 'notes.0.note'
                $noteSur = $request->input("notes.{$noteIndex}.note_sur", 20);
                if ($value < 0 || $value > $noteSur) {
                    $fail("La note doit être entre 0 et {$noteSur}.");
                }
            }],
            'notes.*.note_sur' => 'required|numeric|min:0|max:100',
            'notes.*.commentaire' => 'nullable|string',
        ]);

        $created = 0;
        $skipped = 0;
        $errors = [];
        $totalRows = count($request->notes);

        DB::beginTransaction();
        try {
            foreach ($request->notes as $index => $noteData) {
                // Get student info for error reporting
                $anonymat = Anonymat::with('inscriptionPedagogique.inscriptionAdministrative.etudiant')
                    ->find($noteData['id_anonymat']);
                $studentName = $anonymat && $anonymat->inscriptionPedagogique && $anonymat->inscriptionPedagogique->inscriptionAdministrative && $anonymat->inscriptionPedagogique->inscriptionAdministrative->etudiant
                    ? "{$anonymat->inscriptionPedagogique->inscriptionAdministrative->etudiant->nom} {$anonymat->inscriptionPedagogique->inscriptionAdministrative->etudiant->prenom}"
                    : 'Inconnu';
                $studentCne = $anonymat && $anonymat->inscriptionPedagogique && $anonymat->inscriptionPedagogique->inscriptionAdministrative && $anonymat->inscriptionPedagogique->inscriptionAdministrative->etudiant
                    ? $anonymat->inscriptionPedagogique->inscriptionAdministrative->etudiant->cne
                    : 'N/A';
                $anonymatCode = $anonymat ? $anonymat->code_anonymat : 'N/A';

                // Check for duplicate
                $exists = Note::where('id_anonymat', $noteData['id_anonymat'])
                    ->where('id_examen', $noteData['id_examen'])
                    ->where('id_element', $noteData['id_element'] ?? null)
                    ->exists();

                if (!$exists) {
                    try {
                        // Convert note to uppercase if it's ABS or CAP
                        if (in_array(strtoupper($noteData['note']), ['ABS', 'CAP'])) {
                            $noteData['note'] = strtoupper($noteData['note']);
                        }
                        
                        Note::create($noteData);
                        $created++;
                    } catch (\Exception $e) {
                        $skipped++;
                        $errors[] = [
                            'row' => $index + 1,
                            'cne' => $studentCne,
                            'anonymat' => $anonymatCode,
                            'student_name' => $studentName,
                            'errors' => ['Erreur de base de données: ' . $e->getMessage()]
                        ];
                    }
                } else {
                    $skipped++;
                    $errors[] = [
                        'row' => $index + 1,
                        'cne' => $studentCne,
                        'anonymat' => $anonymatCode,
                        'student_name' => $studentName,
                        'errors' => ['Note déjà existante pour cet étudiant, examen et élément']
                    ];
                }
            }
            DB::commit();

            // Build response message
            $message = $this->buildImportMessage($created, $skipped, $totalRows);

            // Check if request expects JSON (AJAX request)
            if ($request->expectsJson() || $request->ajax()) {
                if (empty($errors)) {
                    return response()->json([
                        'success' => true,
                        'message' => $message,
                        'created' => $created,
                        'skipped' => $skipped,
                        'import_errors' => []
                    ]);
                } else {
                    return response()->json([
                        'success' => $created > 0,
                        'message' => $message,
                        'created' => $created,
                        'skipped' => $skipped,
                        'import_errors' => $errors
                    ], $created > 0 ? 200 : 422);
                }
            }

            // Standard redirect response
            if (empty($errors)) {
                return redirect()->route('correction.notes.index')
                    ->with('success', $message);
            } else {
                return redirect()->route('correction.notes.index')
                    ->with('import_partial', $message)
                    ->with('import_errors', $errors);
            }

        } catch (\Exception $e) {
            DB::rollBack();
            
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur lors de l\'import: ' . $e->getMessage(),
                    'created' => 0,
                    'skipped' => $totalRows,
                    'import_errors' => []
                ], 500);
            }
            
            return back()->withErrors(['error' => 'Erreur lors de l\'import: ' . $e->getMessage()]);
        }
    }

    /**
     * Build human-readable import result message
     */
    private function buildImportMessage(int $created, int $skipped, int $total): string
    {
        if ($skipped === 0) {
            return "Import réussi: {$created} notes créées avec succès";
        } elseif ($created === 0) {
            return "Import échoué: {$skipped} notes avec erreurs sur {$total}";
        } else {
            return "Import partiel: {$created} notes créées, {$skipped} avec erreurs";
        }
    }

    /**
     * Get anonymats for a specific exam (AJAX endpoint)
     */
    public function getAnonymats(Request $request)
    {
        $examenId = $request->input('examen_id');
        
        if (!$examenId) {
            return response()->json([]);
        }

        $anonymats = Anonymat::with([
                'inscriptionPedagogique.inscriptionAdministrative.etudiant'
            ])
            ->where('id_examen', $examenId)
            ->get();

        return response()->json($anonymats);
    }

    /**
     * Get correcteurs for a specific exam (AJAX endpoint)
     */
    public function getCorrecteurs(Request $request)
    {
        $examenId = $request->input('examen_id');
        
        if (!$examenId) {
            return response()->json([]);
        }

        $correcteurs = Correcteur::with(['enseignant'])
            ->where('id_examen', $examenId)
            ->get();

        return response()->json($correcteurs);
    }

    /**
     * Get students by CNE for import (AJAX endpoint)
     */
    public function getStudentsByCne(Request $request)
    {
        $cnes = $request->input('cnes', []);
        $examenId = $request->input('examen_id');
        
        if (empty($cnes) || !$examenId) {
            return response()->json([]);
        }

        $normalizedCnes = collect($cnes)
            ->map(fn ($cne) => $this->normalizeImportIdentifier($cne))
            ->filter()
            ->unique()
            ->values();

        if ($normalizedCnes->isEmpty()) {
            return response()->json([]);
        }

        // Load anonymats for the selected exam and normalize keys in PHP.
        // This is more tolerant to casing and spacing than an exact SQL whereIn.
        $anonymats = Anonymat::with([
                'inscriptionPedagogique.inscriptionAdministrative.etudiant'
            ])
            ->where('id_examen', $examenId)
            ->get();

        // Create a map of CNE to anonymat for easy lookup
        $result = [];
        foreach ($anonymats as $anonymat) {
            if ($anonymat->inscriptionPedagogique && 
                $anonymat->inscriptionPedagogique->inscriptionAdministrative && 
                $anonymat->inscriptionPedagogique->inscriptionAdministrative->etudiant) {
                
                $etudiant = $anonymat->inscriptionPedagogique->inscriptionAdministrative->etudiant;
                $normalizedCne = $this->normalizeImportIdentifier($etudiant->cne);

                if ($normalizedCne === '' || ! $normalizedCnes->contains($normalizedCne)) {
                    continue;
                }

                $result[$normalizedCne] = [
                    'anonymat' => $anonymat,
                    'etudiant' => $etudiant
                ];
            }
        }

        return response()->json($result);
    }

    private function normalizeImportIdentifier($value, bool $stripLeadingZeros = false): string
    {
        $normalized = trim((string) $value);
        $normalized = preg_replace('/\s+/', '', $normalized);

        if ($normalized === null || $normalized === '') {
            return '';
        }

        if ($stripLeadingZeros && preg_match('/^\d+$/', $normalized)) {
            return ltrim($normalized, '0') ?: '0';
        }

        return strtoupper($normalized);
    }
}
