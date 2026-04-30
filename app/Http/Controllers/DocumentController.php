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
    }
}
