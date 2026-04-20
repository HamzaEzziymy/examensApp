<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Examen;
use App\Models\RepartitionEtudiant;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PointageSyncController extends Controller
{
    public function show(Examen $examen): JsonResponse
    {
        $examen->load([
            'module' => fn ($query) => $query->select('modules.id_module', 'modules.code_module', 'modules.nom_module'),
            'element:id_element,id_module,code_element,nom_element',
            'sessionExamen:id_session_examen,nom_session,type_session,date_session_examen',
            'salle:id_salle,code_salle,nom_salle',
            'salles:id_salle,code_salle,nom_salle',
            'repartitions.inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
            'repartitions.inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
            'repartitions.inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,cne,nom,prenom',
        ]);

        $repartitions = $examen->repartitions
            ->sortBy([
                ['code_grille', 'asc'],
                ['numero_place', 'asc'],
            ])
            ->values()
            ->map(fn (RepartitionEtudiant $repartition) => $this->formatRepartition($examen, $repartition));

        return response()->json([
            'data' => [
                'exam' => $this->formatExam($examen),
                'repartitions' => $repartitions,
            ],
        ]);
    }

    public function update(Request $request, Examen $examen): JsonResponse
    {
        $validated = $request->validate([
            'repartitions' => ['required', 'array', 'min:1'],
            'repartitions.*.id_repartition' => ['required', 'integer'],
            'repartitions.*.present' => ['sometimes', 'boolean'],
            'repartitions.*.date_debut' => ['nullable', 'date'],
            'repartitions.*.date_fin' => ['nullable', 'date'],
            'repartitions.*.observation' => ['nullable', 'string'],
        ]);

        $rows = collect($validated['repartitions'])->values();

        $this->validateDateOrder($rows->all());

        $ids = $rows
            ->pluck('id_repartition')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        $repartitions = RepartitionEtudiant::query()
            ->where('id_examen', $examen->id_examen)
            ->whereIn('id_repartition', $ids)
            ->get()
            ->keyBy('id_repartition');

        $missingIds = $ids->diff($repartitions->keys()->map(fn ($id) => (int) $id))->values();
        if ($missingIds->isNotEmpty()) {
            throw ValidationException::withMessages([
                'repartitions' => 'Unknown repartitions for this exam: '.$missingIds->implode(', '),
            ]);
        }

        DB::transaction(function () use ($rows, $repartitions) {
            $rows->each(function (array $row) use ($repartitions) {
                /** @var RepartitionEtudiant $repartition */
                $repartition = $repartitions->get((int) $row['id_repartition']);
                $attributes = [];

                if (array_key_exists('present', $row)) {
                    $attributes['present'] = (bool) $row['present'];
                }

                if (array_key_exists('date_debut', $row)) {
                    $attributes['heure_arrivee'] = $this->timeFromDate($row['date_debut']);
                }

                if (array_key_exists('date_fin', $row)) {
                    $attributes['heure_sortie'] = $this->timeFromDate($row['date_fin']);
                }

                if (array_key_exists('observation', $row)) {
                    $attributes['observation'] = $row['observation'];
                }

                if ($attributes !== []) {
                    $repartition->update($attributes);
                }
            });
        });

        $examen->load([
            'module' => fn ($query) => $query->select('modules.id_module', 'modules.code_module', 'modules.nom_module'),
            'element:id_element,id_module,code_element,nom_element',
            'sessionExamen:id_session_examen,nom_session,type_session,date_session_examen',
            'salle:id_salle,code_salle,nom_salle',
            'salles:id_salle,code_salle,nom_salle',
        ]);

        $updated = RepartitionEtudiant::with([
                'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,cne,nom,prenom',
            ])
            ->whereIn('id_repartition', $ids)
            ->orderBy('code_grille')
            ->orderBy('numero_place')
            ->get()
            ->map(fn (RepartitionEtudiant $repartition) => $this->formatRepartition($examen, $repartition));

        return response()->json([
            'message' => 'Pointage data synced.',
            'data' => [
                'exam' => $this->formatExam($examen),
                'repartitions' => $updated,
            ],
        ]);
    }

    private function formatExam(Examen $examen): array
    {
        return [
            'id_examen' => $examen->id_examen,
            'session' => [
                'id_session_examen' => $examen->sessionExamen?->id_session_examen,
                'nom_session' => $examen->sessionExamen?->nom_session,
                'type_session' => $examen->sessionExamen?->type_session,
                'date_session_examen' => $examen->sessionExamen?->date_session_examen,
            ],
            'module' => [
                'id_module' => $examen->module?->id_module,
                'code_module' => $examen->module?->code_module,
                'nom_module' => $examen->module?->nom_module,
            ],
            'element' => $examen->element ? [
                'id_element' => $examen->element->id_element,
                'code_element' => $examen->element->code_element,
                'nom_element' => $examen->element->nom_element,
            ] : null,
            'date_examen' => $examen->date_examen?->format('Y-m-d'),
            'date_debut' => $examen->date_debut?->format('Y-m-d H:i:s'),
            'date_fin' => $examen->date_fin?->format('Y-m-d H:i:s'),
            'statut' => $examen->statut,
            'salles' => $examen->salles->values()->map(fn ($salle) => [
                'id_salle' => $salle->id_salle,
                'code_salle' => $salle->code_salle,
                'nom_salle' => $salle->nom_salle,
            ]),
        ];
    }

    private function formatRepartition(Examen $examen, RepartitionEtudiant $repartition): array
    {
        $student = $repartition->inscriptionPedagogique?->inscriptionAdministrative?->etudiant;
        $salleIndex = $this->salleIndexFromGrille($repartition->code_grille);
        $salle = $examen->salles->values()->get($salleIndex - 1) ?: $examen->salle;

        return [
            'id_repartition' => $repartition->id_repartition,
            'id_examen' => $repartition->id_examen,
            'id_inscription_pedagogique' => $repartition->id_inscription_pedagogique,
            'student' => [
                'id_etudiant' => $student?->id_etudiant,
                'cne' => $student?->cne,
                'nom' => $student?->nom,
                'prenom' => $student?->prenom,
            ],
            'type_inscription' => $repartition->inscriptionPedagogique?->type_inscription,
            'code_grille' => $repartition->code_grille,
            'code_anonymat' => $repartition->code_anonymat,
            'numero_place' => $repartition->numero_place,
            'salle_index' => $salleIndex,
            'salle' => $salle ? [
                'id_salle' => $salle->id_salle,
                'code_salle' => $salle->code_salle,
                'nom_salle' => $salle->nom_salle,
            ] : null,
            'present' => (bool) $repartition->present,
            'date_debut' => $this->dateTimeFromExamDate($examen, $repartition->heure_arrivee),
            'date_fin' => $this->dateTimeFromExamDate($examen, $repartition->heure_sortie),
            'heure_arrivee' => $repartition->heure_arrivee,
            'heure_sortie' => $repartition->heure_sortie,
            'observation' => $repartition->observation,
            'updated_at' => $repartition->updated_at?->format('Y-m-d H:i:s'),
        ];
    }

    private function validateDateOrder(array $rows): void
    {
        $errors = [];

        foreach ($rows as $index => $row) {
            if (empty($row['date_debut']) || empty($row['date_fin'])) {
                continue;
            }

            if (Carbon::parse($row['date_fin'])->lt(Carbon::parse($row['date_debut']))) {
                $errors["repartitions.$index.date_fin"] = 'The date_fin must be after or equal to date_debut.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function timeFromDate(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return Carbon::parse($value)->format('H:i:s');
    }

    private function dateTimeFromExamDate(Examen $examen, ?string $time): ?string
    {
        if ($time === null || trim((string) $time) === '') {
            return null;
        }

        $date = $examen->date_examen?->format('Y-m-d') ?? now()->format('Y-m-d');

        return Carbon::parse($date.' '.$time)->format('Y-m-d H:i:s');
    }

    private function salleIndexFromGrille($codeGrille): int
    {
        $str = str_pad((string) ($codeGrille ?? ''), 7, '0', STR_PAD_LEFT);
        $digit = (int) ($str[3] ?? 1);

        return $digit >= 1 ? $digit : 1;
    }
}
