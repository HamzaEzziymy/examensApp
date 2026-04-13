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
    public function index(Request $request)
    {
        $examens = Examen::with(['module.offresFormation.section', 'module.elements'])
            ->latest('date_examen')
            ->limit(200)
            ->get();

        $enseignants = \App\Models\Enseignant::select('id_enseignant', 'nom', 'prenom')->get();

        return Inertia::render('correction/Notes/Index', [
            'examens'     => $examens,
            'enseignants' => $enseignants,
        ]);
    }

    /**
     * Get grouped notes by examen and element (AJAX endpoint)
     */
    public function getGroupedNotes(Request $request)
    {
        try {
            $idFiliere = $request->input('id_filiere');
            $idAnnee   = $request->input('id_annee');

            $totalNotes = Note::count();
            if ($totalNotes === 0) {
                return response()->json([]);
            }

            $query = Note::with([
                'anonymat.inscriptionPedagogique.inscriptionAdministrative.etudiant',
                'examen.sessionExamen',
                'examen.module.offresFormation.section.filiere',
                'examen.module.offresFormation.anneeUniversitaire',
                'examen.module',
                'element',
                'enseignant',
            ]);

            $shouldFilterFiliere = $idFiliere && $idFiliere !== 'all';
            $shouldFilterAnnee   = $idAnnee   && $idAnnee   !== 'all';

            if ($shouldFilterFiliere || $shouldFilterAnnee) {
                $query->whereHas('examen', function ($qExamen) use ($shouldFilterFiliere, $shouldFilterAnnee, $idFiliere, $idAnnee) {
                    $qExamen->whereHas('module', function ($qModule) use ($shouldFilterFiliere, $shouldFilterAnnee, $idFiliere, $idAnnee) {
                        $qModule->whereHas('offresFormation', function ($qOffre) use ($shouldFilterFiliere, $shouldFilterAnnee, $idFiliere, $idAnnee) {
                            if ($shouldFilterFiliere) {
                                $qOffre->whereHas('section', fn($q) => $q->where('id_filiere', $idFiliere));
                            }
                            if ($shouldFilterAnnee) {
                                $qOffre->where('id_annee', $idAnnee);
                            }
                        });
                    });
                });
            }

            $notes = $query->get();

            if ($notes->isEmpty()) {
                return response()->json([]);
            }

            $grouped = $notes->groupBy(function ($note) {
                return $note->id_examen . '-' . ($note->id_element ?? 'module');
            })->map(function ($groupNotes) {
                $firstNote = $groupNotes->first();
                $module    = $firstNote->examen?->module;
                $element   = $firstNote->element;

                return [
                    'id_examen'      => $firstNote->id_examen,
                    'id_element'     => $firstNote->id_element,
                    'session_nom'    => $firstNote->examen?->sessionExamen?->nom_session ?? null,
                    'session_type'   => $firstNote->examen?->sessionExamen?->type_session ?? null,
                    'module_code'    => $module?->code_module ?? 'N/A',
                    'module_name'    => $module?->nom_module  ?? 'Module inconnu',
                    'element_code'   => $element?->code_element ?? null,
                    'element_name'   => $element?->nom_element  ?? null,
                    'notes_count'    => $groupNotes->count(),
                    'notes'        => $groupNotes->map(function ($note) {
                        $etudiant = $note->anonymat?->etudiant
                            ?? $note->anonymat?->inscriptionPedagogique?->inscriptionAdministrative?->etudiant;

                        return [
                            'id_note'          => $note->id_note,
                            'note'             => $note->note,
                            'note_sur'         => $note->note_sur ?? 20,
                            'date_saisie'      => $note->date_saisie ?? $note->created_at,
                            'code_anonymat'    => $note->anonymat?->code_anonymat ?? 'N/A',
                            'etudiant_nom'     => $etudiant?->nom    ?? 'Inconnu',
                            'etudiant_prenom'  => $etudiant?->prenom ?? '',
                            'etudiant_cne'     => $etudiant?->cne    ?? 'N/A',
                            'enseignant_nom'   => $note->enseignant?->nom    ?? null,
                            'enseignant_prenom'=> $note->enseignant?->prenom ?? null,
                        ];
                    })->values()->toArray(),
                ];
            })->values()->toArray();

            return response()->json($grouped);

        } catch (\Exception $e) {
            \Log::error('Error in getGroupedNotes: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Export notes as PDF with custom columns
     */
    public function exportPdfCustom(Request $request)
    {
        $idExamen  = $request->input('id_examen');
        $idElement = $request->input('id_element');
        $sortBy    = $request->input('sort_by', 'nom');
        $sortOrder = $request->input('sort_order', 'asc');
        $columns   = $request->input('columns', ['num','anonymat','cne','nom','prenom','note','mention']);

        $query = Note::with([
            'anonymat.inscriptionPedagogique.inscriptionAdministrative.etudiant',
            'examen.module.offresFormation.section.filiere',
            'examen.module.offresFormation.semestre.niveau',
            'examen.module.offresFormation.anneeUniversitaire',
            'examen.sessionExamen.anneeUniversitaire',
            'examen.sessionExamen.filiere',
            'element',
            'enseignant',
        ])->where('id_examen', $idExamen);

        if ($idElement && $idElement !== 'null' && $idElement !== 'undefined') {
            $query->where('id_element', $idElement);
        }

        $notes = $query->get()->map(function ($note) {
            $etudiant = $note->anonymat?->etudiant;
            return [
                'cne'        => $etudiant?->cne    ?? 'N/A',
                'nom'        => $etudiant?->nom     ?? 'Inconnu',
                'prenom'     => $etudiant?->prenom  ?? '',
                'anonymat'   => $note->anonymat?->code_anonymat ?? 'N/A',
                'note'       => $note->note,
                'note_sur'   => $note->note_sur ?? 20,
                'enseignant' => $note->enseignant ? $note->enseignant->nom . ' ' . $note->enseignant->prenom : null,
            ];
        });

        $notes = $notes->sortBy(function ($n) use ($sortBy) {
            return match($sortBy) {
                'note'    => is_numeric($n['note']) ? (float)$n['note'] : -1,
                'anonymat'=> is_numeric($n['anonymat']) ? (int)$n['anonymat'] : $n['anonymat'],
                'cne'     => $n['cne'],
                default   => $n['nom'] . ' ' . $n['prenom'],
            };
        }, SORT_REGULAR, $sortOrder === 'desc')->values();

        $firstNote = Note::with([
            'examen.module.offresFormation.section.filiere',
            'examen.module.offresFormation.semestre.niveau',
            'examen.module.offresFormation.anneeUniversitaire',
            'examen.sessionExamen.anneeUniversitaire',
            'examen.sessionExamen.filiere',
            'element',
        ])->where('id_examen', $idExamen)->first();

        $module  = $firstNote?->examen?->module;
        $element = $firstNote?->element;
        $session = $firstNote?->examen?->sessionExamen;
        $offre   = $module?->offresFormation?->first();

        $data = [
            'notes'    => $notes->toArray(),
            'columns'  => is_array($columns) ? $columns : explode(',', $columns),
            'module'   => $module,
            'element'  => $element,
            'annee'    => $offre?->anneeUniversitaire?->annee_univ ?? $session?->anneeUniversitaire?->annee_univ ?? '',
            'filiere'  => $offre?->section?->filiere?->nom_filiere ?? $session?->filiere?->nom_filiere ?? '',
            'niveau'   => $offre?->semestre?->niveau?->nom_niveau ?? '',
            'faculte'  => \App\Models\Faculte::first(),
            'session'  => $session?->nom_session ?? '',
            'semestre' => $session?->quadrimestre ? 'Semestre ' . $session->quadrimestre : '',
            'generated'=> now()->format('d/m/Y H:i:s'),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.releve-notes-custom', $data)
            ->setPaper('a4', 'portrait');

        return $pdf->download('releve_custom_' . ($module?->code_module ?? 'module') . '_' . now()->format('Ymd') . '.pdf');
    }

    /**
     * Export notes as PDF (Relevé de Notes)
     */
    public function exportPdf(Request $request)
    {
        $idExamen  = $request->input('id_examen');
        $idElement = $request->input('id_element');
        $sortBy    = $request->input('sort_by', 'nom');
        $sortOrder = $request->input('sort_order', 'asc');

        $query = Note::with([
            'anonymat.inscriptionPedagogique.inscriptionAdministrative.etudiant',
            'examen.module.offresFormation.section.filiere',
            'examen.module.offresFormation.anneeUniversitaire',
            'examen.sessionExamen',
            'element',
            'enseignant',
        ])->where('id_examen', $idExamen);

        if ($idElement && $idElement !== 'null' && $idElement !== 'undefined') {
            $query->where('id_element', $idElement);
        }

        $notes = $query->get()->map(function ($note) {
            $etudiant = $note->anonymat?->etudiant;
            return [
                'cne'      => $etudiant?->cne    ?? 'N/A',
                'nom'      => $etudiant?->nom     ?? 'Inconnu',
                'prenom'   => $etudiant?->prenom  ?? '',
                'anonymat' => $note->anonymat?->code_anonymat ?? 'N/A',
                'note'     => $note->note,
                'note_sur' => $note->note_sur ?? 20,
            ];
        });

        $notes = $notes->sortBy(function ($n) use ($sortBy) {
            return match($sortBy) {
                'note'    => is_numeric($n['note']) ? (float)$n['note'] : -1,
                'anonymat'=> is_numeric($n['anonymat']) ? (int)$n['anonymat'] : $n['anonymat'],
                'cne'     => $n['cne'],
                default   => $n['nom'] . ' ' . $n['prenom'],
            };
        }, SORT_REGULAR, $sortOrder === 'desc')->values();

        // Gather meta info
        $firstNote  = Note::with([
            'examen.module.offresFormation.section.filiere',
            'examen.module.offresFormation.semestre.niveau',
            'examen.module.offresFormation.anneeUniversitaire',
            'examen.sessionExamen.anneeUniversitaire',
            'examen.sessionExamen.filiere',
            'element',
        ])->where('id_examen', $idExamen)->first();

        $module  = $firstNote?->examen?->module;
        $element = $firstNote?->element;
        $session = $firstNote?->examen?->sessionExamen;
        $offre   = $module?->offresFormation?->first();

        $annee      = $offre?->anneeUniversitaire?->annee_univ
                   ?? $session?->anneeUniversitaire?->annee_univ
                   ?? '';
        $filiere    = $offre?->section?->filiere?->nom_filiere
                   ?? $session?->filiere?->nom_filiere
                   ?? '';
        $niveau     = $offre?->semestre?->niveau?->nom_niveau ?? '';
        $sessionNom = $session?->nom_session ?? '';
        $semestre   = $session?->quadrimestre ? 'Semestre ' . $session->quadrimestre : '';
        $faculte    = \App\Models\Faculte::first();

        \Log::info('=== PDF Session Debug ===');
        \Log::info('Session: ' . ($session ? $session->nom_session : 'NULL'));
        \Log::info('Semestre: ' . $semestre);
        \Log::info('Annee: ' . $annee);
        \Log::info('Filiere: ' . $filiere);
        \Log::info('Niveau: ' . $niveau);

        $data = [
            'notes'     => $notes->toArray(),
            'module'    => $module,
            'element'   => $element,
            'annee'     => $annee,
            'filiere'   => $filiere,
            'niveau'    => $niveau,
            'faculte'   => $faculte,
            'session'   => $sessionNom,
            'semestre'  => $semestre,
            'generated' => now()->format('d/m/Y H:i:s'),
        ];

        if ($request->has('debug')) {
            return response()->json($data);
        }

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.releve-notes', $data)
            ->setPaper('a4', 'portrait');

        $filename = 'releve_notes_' . ($module?->code_module ?? 'module') . '_' . now()->format('Ymd') . '.pdf';

        return $pdf->download($filename);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_anonymat'  => 'required|exists:anonymat,id_anonymat',
            'id_examen'    => 'required|exists:examens,id_examen',
            'id_element'   => 'nullable|exists:elements_module,id_element',
            'id_enseignant'=> 'nullable|exists:enseignants,id_enseignant',
            'note'         => ['required', $this->noteValidationRule($request)],
            'note_sur'     => 'required|numeric|min:0|max:100',
            'commentaire'  => 'nullable|string',
        ]);

        if (in_array(strtoupper($validated['note']), ['ABS', 'CAP'])) {
            $validated['note'] = strtoupper($validated['note']);
        }

        Note::create($validated);

        return redirect()->route('correction.notes.index')->with('success', 'Note ajoutée avec succès');
    }

    public function show($id)
    {
        $note = Note::with([
            'anonymat.inscriptionPedagogique.inscriptionAdministrative.etudiant',
            'examen.module', 'element', 'enseignant',
        ])->findOrFail($id);

        return response()->json($note);
    }

    public function edit(string $id) {}

    public function update(Request $request, $id)
    {
        $note      = Note::findOrFail($id);
        $validated = $request->validate([
            'id_anonymat'  => 'required|exists:anonymat,id_anonymat',
            'id_examen'    => 'required|exists:examens,id_examen',
            'id_element'   => 'nullable|exists:elements_module,id_element',
            'id_enseignant'=> 'nullable|exists:enseignants,id_enseignant',
            'note'         => ['required', $this->noteValidationRule($request)],
            'note_sur'     => 'required|numeric|min:0|max:100',
            'commentaire'  => 'nullable|string',
        ]);

        if (in_array(strtoupper($validated['note']), ['ABS', 'CAP'])) {
            $validated['note'] = strtoupper($validated['note']);
        }

        $note->update($validated);

        return redirect()->route('correction.notes.index')->with('success', 'Note modifiée avec succès');
    }

    public function destroy($id)
    {
        Note::findOrFail($id)->delete();
        return redirect()->route('correction.notes.index')->with('success', 'Note supprimée avec succès');
    }

    public function import(Request $request)
    {
        if ($request->has('notes') && is_array($request->notes)) {
            return $this->bulkStore($request);
        }
        return redirect()->route('correction.notes.index')->with('success', 'Import en cours de développement');
    }

    protected function bulkStore(Request $request)
    {
        $request->validate([
            'notes'                => 'required|array|min:1',
            'notes.*.id_anonymat'  => 'required|exists:anonymat,id_anonymat',
            'notes.*.id_examen'    => 'required|exists:examens,id_examen',
            'notes.*.id_element'   => 'nullable|exists:elements_module,id_element',
            'notes.*.id_enseignant'=> 'nullable|exists:enseignants,id_enseignant',
            'notes.*.note_sur'     => 'required|numeric|min:0|max:100',
            'notes.*.commentaire'  => 'nullable|string',
        ]);

        $created   = 0;
        $skipped   = 0;
        $errors    = [];
        $totalRows = count($request->notes);

        DB::beginTransaction();
        try {
            foreach ($request->notes as $index => $noteData) {
                $anonymat    = Anonymat::with('inscriptionPedagogique.inscriptionAdministrative.etudiant')->find($noteData['id_anonymat']);
                $etudiant    = $anonymat?->inscriptionPedagogique?->inscriptionAdministrative?->etudiant;
                $studentName = $etudiant ? "{$etudiant->nom} {$etudiant->prenom}" : 'Inconnu';
                $studentCne  = $etudiant?->cne ?? 'N/A';
                $anonymatCode= $anonymat?->code_anonymat ?? 'N/A';

                $exists = Note::where('id_anonymat', $noteData['id_anonymat'])
                    ->where('id_examen', $noteData['id_examen'])
                    ->where('id_element', $noteData['id_element'] ?? null)
                    ->exists();

                if (!$exists) {
                    try {
                        if (in_array(strtoupper($noteData['note']), ['ABS', 'CAP'])) {
                            $noteData['note'] = strtoupper($noteData['note']);
                        }
                        Note::create($noteData);
                        $created++;
                    } catch (\Exception $e) {
                        $skipped++;
                        $errors[] = ['row' => $index + 1, 'cne' => $studentCne, 'anonymat' => $anonymatCode, 'student_name' => $studentName, 'errors' => ['Erreur DB: ' . $e->getMessage()]];
                    }
                } else {
                    $skipped++;
                    $errors[] = ['row' => $index + 1, 'cne' => $studentCne, 'anonymat' => $anonymatCode, 'student_name' => $studentName, 'errors' => ['Note déjà existante']];
                }
            }
            DB::commit();

            $message = $this->buildImportMessage($created, $skipped, $totalRows);

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success'       => $created > 0,
                    'message'       => $message,
                    'created'       => $created,
                    'skipped'       => $skipped,
                    'import_errors' => $errors,
                ], empty($errors) || $created > 0 ? 200 : 422);
            }

            return redirect()->route('correction.notes.index')->with(empty($errors) ? 'success' : 'import_partial', $message);

        } catch (\Exception $e) {
            DB::rollBack();
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json(['success' => false, 'message' => 'Erreur: ' . $e->getMessage(), 'created' => 0, 'skipped' => $totalRows, 'import_errors' => []], 500);
            }
            return back()->withErrors(['error' => 'Erreur: ' . $e->getMessage()]);
        }
    }

    private function buildImportMessage(int $created, int $skipped, int $total): string
    {
        if ($skipped === 0)   return "Import réussi: {$created} notes créées";
        if ($created === 0)   return "Import échoué: {$skipped} erreurs sur {$total}";
        return "Import partiel: {$created} créées, {$skipped} erreurs";
    }

    private function noteValidationRule(Request $request): \Closure
    {
        return function ($attribute, $value, $fail) use ($request) {
            if (in_array(strtoupper($value), ['ABS', 'CAP'])) return;
            if (!is_numeric($value)) { $fail('La note doit être un nombre ou ABS/CAP.'); return; }
            $noteSur = $request->input('note_sur', 20);
            if ($value < 0 || $value > $noteSur) $fail("La note doit être entre 0 et {$noteSur}.");
        };
    }

    public function getAnonymats(Request $request)
    {
        $examenId = $request->input('examen_id');
        if (!$examenId) return response()->json([]);

        return response()->json(
            Anonymat::with(['inscriptionPedagogique.inscriptionAdministrative.etudiant'])
                ->where('id_examen', $examenId)->get()
        );
    }

    public function getCorrecteurs(Request $request)
    {
        $examenId = $request->input('examen_id');
        if (!$examenId) return response()->json([]);

        return response()->json(
            Correcteur::with(['enseignant'])->where('id_examen', $examenId)->get()
        );
    }

    public function getStudentsByCne(Request $request)
    {
        $cnes     = $request->input('cnes', []);
        $examenId = $request->input('examen_id');
        if (empty($cnes) || !$examenId) return response()->json([]);

        $anonymats = Anonymat::with(['inscriptionPedagogique.inscriptionAdministrative.etudiant'])
            ->where('id_examen', $examenId)
            ->whereHas('inscriptionPedagogique.inscriptionAdministrative.etudiant', fn($q) => $q->whereIn('cne', $cnes))
            ->get();

        $result = [];
        foreach ($anonymats as $anonymat) {
            $etudiant = $anonymat->inscriptionPedagogique?->inscriptionAdministrative?->etudiant;
            if ($etudiant) {
                $result[$etudiant->cne] = ['anonymat' => $anonymat, 'etudiant' => $etudiant];
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
