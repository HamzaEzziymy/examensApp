<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Filiere;
use App\Models\Module;
use App\Models\Niveau;
use App\Models\Salle;
use App\Models\Section;
use App\Models\SessionExamen;
use App\Services\PvAbsenceDatasetService;
use App\Services\PvAbsenceFormOptionsService;
use App\Services\PvAbsencePdfService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\ValidationException;

class DocumentController extends Controller
{
    public function indexPv(PvAbsenceFormOptionsService $pvAbsenceFormOptionsService): Response
    {
        $documents = Document::orderBy('created_at', 'desc')->get();

        return Inertia::render(
            'Documents/Pvs/Index',
            array_merge(
                ['documents' => $documents],
                $pvAbsenceFormOptionsService->payload()
            )
        );
    }

    public function storePv(
        Request $request,
        PvAbsenceDatasetService $pvAbsenceDatasetService,
        PvAbsencePdfService $pvAbsencePdfService
    ): RedirectResponse
    {
        $validated = $request->validate([
            'nomDoc' => ['required', 'string', 'max:255'],
            'descripDoc' => ['nullable', 'string'],
            'session_id' => ['required', 'integer', 'exists:sessions_examen,id_session_examen'],
            'niveau_id' => ['required', 'integer', 'exists:niveaux,id_niveau'],
            'filiere_id' => ['required', 'integer', 'exists:filieres,id_filiere'],
            'section_id' => ['required', 'integer', 'exists:sections,id_section'],
            'salle_id' => ['required', 'integer', 'exists:salles,id_salle'],
            'module_id' => ['nullable', 'integer', 'exists:modules,id_module'],
        ]);

        $context = $this->resolvePvContext($validated);
        $pages = $this->buildPvPages($validated, $context, $pvAbsenceDatasetService);

        if ($pages->isEmpty()) {
            throw ValidationException::withMessages([
                'module_id' => 'Aucun examen avec repartition n\'a ete trouve pour les filtres selectionnes.',
            ]);
        }

        $generatedAt = now();
        $fileToken = $generatedAt->format('Y-m-d_H-i-s');

        $publicStoragePvPath = public_path('storage/pvs_absence');
        if (! File::exists($publicStoragePvPath)) {
            File::makeDirectory($publicStoragePvPath, 0755, true);
        }

        $filenameBase = $validated['module_id']
            ? 'pv-absence-'.$this->slug($pages->first()['module_code'] ?? $pages->first()['module_name'] ?? 'module')
            : 'pv-absence-modules';
        $filename = $fileToken.'-'.$filenameBase.'.pdf';
        $docUrl = 'storage/pvs_absence/'.$filename;

        $pvAbsencePdfService
            ->make(
                $pages,
                $validated['nomDoc'],
                $validated['descripDoc'] ?? null,
                $generatedAt
            )
            ->save(public_path($docUrl));

        Document::create([
            'nomDoc' => $validated['nomDoc'],
            'descripDoc' => $validated['descripDoc'] ?? null,
            'url' => $docUrl,
        ]);

        return redirect()->back()->with('success', 'Proces-verbal genere avec succes.');
    }

    public function destroyPv(Document $document): RedirectResponse
    {
        $filePath = public_path($document->url);
<<<<<<< HEAD

        $document->delete();

        if (File::exists($filePath)) {
            File::delete($filePath);
        }

        return Redirect()->back();
=======

        if (file_exists($filePath)) {
            unlink($filePath);
        }

        $document->delete();

        return redirect()->back();
    }

    private function resolvePvContext(array $validated): array
    {
        $session = SessionExamen::query()->findOrFail($validated['session_id']);
        $niveau = Niveau::query()->findOrFail($validated['niveau_id']);
        $filiere = Filiere::query()->findOrFail($validated['filiere_id']);
        $section = Section::query()->findOrFail($validated['section_id']);
        $salle = Salle::query()->findOrFail($validated['salle_id']);
        $module = ! empty($validated['module_id'])
            ? Module::query()->findOrFail($validated['module_id'])
            : null;

        if ((int) $section->id_filiere !== (int) $filiere->id_filiere) {
            throw ValidationException::withMessages([
                'section_id' => 'La section selectionnee ne correspond pas a la filiere.',
            ]);
        }

        if ($session->id_filiere && (int) $session->id_filiere !== (int) $filiere->id_filiere) {
            throw ValidationException::withMessages([
                'filiere_id' => 'La filiere selectionnee ne correspond pas a la session.',
            ]);
        }

        return compact('session', 'niveau', 'filiere', 'section', 'salle', 'module');
    }

    private function buildPvPages(array $validated, array $context, PvAbsenceDatasetService $pvAbsenceDatasetService): Collection
    {
        /** @var SessionExamen $session */
        $session = $context['session'];
        /** @var Niveau $niveau */
        $niveau = $context['niveau'];
        /** @var Section $section */
        $section = $context['section'];
        /** @var Salle $salle */
        $salle = $context['salle'];
        /** @var Module|null $module */
        $module = $context['module'];

        return $pvAbsenceDatasetService->buildPages([
            'session_id' => (int) $session->id_session_examen,
            'niveau_id' => (int) $niveau->id_niveau,
            'filiere_id' => (int) $context['filiere']->id_filiere,
            'section_id' => (int) $section->id_section,
            'annee_id' => $session->id_annee ? (int) $session->id_annee : null,
            'salle_id' => (int) $salle->id_salle,
            'module_id' => $module?->id_module ? (int) $module->id_module : null,
        ]);
    }

    private function slug(string $value): string
    {
        return Str::slug($value) ?: 'document';
>>>>>>> 93be32bc46c3793c8e3808b56b9d9c196f5c0fd4
    }

    /**
     * Generate PVs from exam planification.
     * Select: session + filière
     * Output: one PDF per section (within that filière)
     *         each PDF has one page per exam (module + salle) — same style as pv_absence
     */
    public function generateFromPlanification(Request $request)
    {
        $request->validate([
            'id_session' => 'required|exists:sessions_examen,id_session_examen',
            'id_filiere' => 'required|exists:filieres,id_filiere',
            'id_section' => 'required|exists:sections,id_section',
            'nomDoc'     => 'nullable|string|max:255',
        ]);

        $sessionId  = $request->id_session;
        $filiereId  = $request->id_filiere;
        $sectionId  = $request->id_section;
        $session    = \App\Models\SessionExamen::findOrFail($sessionId);
        $filiere    = \App\Models\Filiere::findOrFail($filiereId);
        $section    = \App\Models\Section::findOrFail($sectionId);

        // Load all planned exams for this session + filière
        // Load both the direct salle (id_salle) and the pivot salles (exam_salle)
        $examens = \App\Models\Examen::with([
            'offreFormation.module',
            'offreFormation.semestre.niveau',
            'offreFormation.section.filiere',
            'salle',
            'salles',
        ])
        ->where('id_session_examen', $sessionId)
        ->whereHas('offreFormation', fn($q) => $q->where('id_section', $sectionId))
        ->where(function ($q) {
            $q->whereNotNull('id_salle')->orWhereHas('salles');
        })
        ->get();

        if ($examens->isEmpty()) {
            return redirect()->back()->withErrors(['error' => 'Aucun examen planifié pour cette session et section.']);
        }

        // Expand exams: if an exam has multiple salles (via pivot), create one entry per salle
        $expandedExams = collect();
        foreach ($examens as $examen) {
            $allSalles = collect();
            if ($examen->salle) $allSalles->push($examen->salle);
            if ($examen->salles && $examen->salles->isNotEmpty()) {
                $allSalles = $allSalles->merge($examen->salles);
            }
            $allSalles = $allSalles->unique('id_salle');

            foreach ($allSalles as $salle) {
                $expandedExams->push((object)[
                    'examen' => $examen,
                    'salle'  => $salle,
                ]);
            }
        }

        // Group by niveau
        $byNiveau = $expandedExams->groupBy(fn($item) => $item->examen->offreFormation?->semestre?->niveau?->nom_niveau ?? 'Sans Niveau');

        $publicStoragePvPath = public_path('storage/pvs_absence');
        if (! File::exists($publicStoragePvPath)) {
            File::makeDirectory($publicStoragePvPath, 0755, true);
        }

        $now     = now()->format('Y-m-d_H-i-s');
        $created = 0;

        foreach ($byNiveau as $niveauNom => $itemsSection) {
            // Each item = one PV page (one exam + one salle)
            $pvPages = $itemsSection->map(function ($item) use ($filiere) {
                $examen  = $item->examen;
                $salle   = $item->salle;
                $offre   = $examen->offreFormation;
                $module  = $offre?->module;
                $niveau  = $offre?->semestre?->niveau;
                $section = $offre?->section;

                return [
                    'niveau'      => $niveau?->nom_niveau ?? '',
                    'filiere'     => $filiere->nom_filiere,
                    'section'     => $section?->nom_section ?? '',
                    'salle'       => $salle?->nom_salle ?? '—',
                    'module'      => $module?->nom_module ?? '—',
                    'date_examen' => $examen->date_examen?->format('d/m/Y') ?? '',
                    'heure_debut' => $examen->date_debut?->format('H:i') ?? '',
                    'heure_fin'   => $examen->date_fin?->format('H:i') ?? '',
                ];
            })->values()->toArray();

            $slug     = \Illuminate\Support\Str::slug($niveauNom);
            $filename = $now . '_pv_' . \Illuminate\Support\Str::slug($filiere->nom_filiere) . '_' . $slug . '.pdf';
            $filePath = 'storage/pvs_absence/' . $filename;
            $savePath = public_path($filePath);

            Pdf::view('pdfs.pv_planification', [
                'filiere'  => $filiere->nom_filiere,
                'section'  => $niveauNom,
                'session'  => $session->nom_session,
                'pvPages'  => $pvPages,
            ])
            ->format('a4')
            ->margins(12, 10, 14, 10)
            ->save($savePath);

            $docName = ($request->nomDoc ?? 'PV') . ' — ' . $filiere->nom_filiere . ' — ' . $section->nom_section . ' — ' . $niveauNom . ' — ' . $session->nom_session;

            Document::create([
                'nomDoc'     => $docName,
                'descripDoc' => 'Filière: ' . $filiere->nom_filiere . ' | Section: ' . $section->nom_section . ' | Niveau: ' . $niveauNom . ' | Session: ' . $session->nom_session . ' | ' . count($pvPages) . ' examen(s)',
                'url'        => $filePath,
            ]);

            $created++;
        }

        return redirect()->back()->with('success', "{$created} PV(s) générés — {$filiere->nom_filiere} / {$section->nom_section}.");
    }
}
