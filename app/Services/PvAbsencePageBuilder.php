<?php

namespace App\Services;

use App\Models\Examen;
use Illuminate\Support\Collection;

class PvAbsencePageBuilder
{
    public function build(
        Collection $examens,
        ?int $requestedSalleId = null,
        ?int $requestedSalleIndex = null,
        ?string $requestedSalleLabel = null,
        ?Collection $allowedStudentKeys = null
    ): Collection
    {
        $studentKeys = $allowedStudentKeys && $allowedStudentKeys->isNotEmpty()
            ? $allowedStudentKeys
                ->map(fn ($key) => (string) $key)
                ->filter()
                ->unique()
                ->values()
            : null;

        return $examens
            ->map(fn (Examen $examen) => $this->mapPage(
                $examen,
                $requestedSalleId,
                $requestedSalleIndex,
                $requestedSalleLabel,
                $studentKeys
            ))
            ->filter()
            ->values();
    }

    private function mapPage(
        Examen $examen,
        ?int $requestedSalleId,
        ?int $requestedSalleIndex,
        ?string $requestedSalleLabel,
        ?Collection $allowedStudentKeys
    ): ?array
    {
        $salles = $this->examSalles($examen);
        $requestedSalle = $requestedSalleId
            ? $salles->first(fn ($salle) => (int) $salle->id_salle === $requestedSalleId)
            : null;
        $salleIndex = $requestedSalleIndex ?: $this->resolveSalleIndex($salles, $requestedSalleId);

        if (! $requestedSalle && $requestedSalleId && $examen->salle && (int) $examen->salle->id_salle === $requestedSalleId) {
            $requestedSalle = $examen->salle;
        }

        if (! $requestedSalle && $requestedSalleIndex && $requestedSalleIndex > 0) {
            $requestedSalle = $salles->get($requestedSalleIndex - 1);
        }

        $roomRepartitions = collect($examen->repartitions ?? []);
        if ($salleIndex !== null) {
            $roomRepartitions = $roomRepartitions
                ->filter(fn ($repartition) => $this->salleIndexFromGrille($repartition->code_grille) === $salleIndex)
                ->values();
        }

        if ($allowedStudentKeys && $allowedStudentKeys->isNotEmpty()) {
            $roomRepartitions = $roomRepartitions
                ->filter(fn ($repartition) => $allowedStudentKeys->contains($this->studentKey($repartition)))
                ->values();
        }

        if ($roomRepartitions->isEmpty()) {
            return null;
        }

        $absencePedagogicalIds = collect($examen->absences ?? [])
            ->map(fn ($absence) => (int) ($absence->anonymat?->id_inscription_pedagogique ?? 0))
            ->filter()
            ->unique()
            ->values();

        $hasExplicitAbsences = $absencePedagogicalIds->isNotEmpty();
        $hasPresenceMarks = $roomRepartitions->contains(fn ($repartition) => (bool) $repartition->present);

        $absentSource = $roomRepartitions->filter(function ($repartition) use ($absencePedagogicalIds, $hasExplicitAbsences, $hasPresenceMarks) {
            if ($hasExplicitAbsences) {
                return $absencePedagogicalIds->contains((int) $repartition->id_inscription_pedagogique);
            }

            if ($hasPresenceMarks) {
                return ! (bool) $repartition->present;
            }

            return false;
        });

        $absentRows = $absentSource
            ->map(function ($repartition) {
                $student = $repartition->inscriptionPedagogique?->inscriptionAdministrative?->etudiant;

                return [
                    'place' => $repartition->numero_place ?: '-',
                    'cne' => $student?->cne,
                    'name' => trim(collect([$student?->nom, $student?->prenom])->filter()->implode(' ')) ?: '-',
                ];
            })
            ->values();

        $total = $roomRepartitions->count();
        $attendanceKnown = $hasExplicitAbsences || $hasPresenceMarks;
        $absentCount = $attendanceKnown ? $absentRows->count() : null;
        $presentCount = $hasExplicitAbsences
            ? max($total - (int) $absentCount, 0)
            : ($hasPresenceMarks ? $roomRepartitions->where('present', true)->count() : null);

        $moduleCode = trim((string) ($examen->module?->code_module ?? ''));
        $moduleName = trim((string) ($examen->module?->nom_module ?? ''));
        $moduleLabel = trim(collect([$moduleCode, $moduleName])->filter()->implode(' - '));
        $offre = $examen->offreFormation;
        $section = $offre?->section;
        $filiere = $section?->filiere;
        $niveau = $offre?->semestre?->niveau;

        return [
            'session' => $examen->sessionExamen?->nom_session ?? '-',
            'salle' => $requestedSalleLabel
                ?: $requestedSalle?->nom_salle
                ?? $requestedSalle?->code_salle
                ?? $examen->salle?->nom_salle
                ?? ($salleIndex ? 'Salle '.$salleIndex : null)
                ?? 'Salle',
            'module_code' => $moduleCode,
            'module_name' => $moduleName,
            'module_label' => $moduleLabel !== '' ? $moduleLabel : 'Module',
            'niveau' => $niveau?->nom_niveau ?? '-',
            'filiere' => $filiere?->nom_filiere ?? '-',
            'section' => $section?->nom_section ?? '-',
            'date_examen' => optional($examen->date_examen)->format('d/m/Y') ?? '-',
            'heure_debut' => optional($examen->date_debut)->format('H:i') ?? '-',
            'heure_fin' => optional($examen->date_fin)->format('H:i') ?? '-',
            'duree' => $this->formatDuration($examen),
            'total' => $total,
            'present' => $presentCount,
            'absent' => $absentCount,
            'attendance_known' => $attendanceKnown,
            'absents' => $absentRows,
        ];
    }

    private function examSalles(Examen $examen): Collection
    {
        $salles = collect($examen->salles ?? [])->filter();

        if ($salles->isEmpty() && $examen->salle) {
            $salles = collect([$examen->salle]);
        }

        return $salles->values();
    }

    private function resolveSalleIndex(Collection $salles, int $requestedSalleId): ?int
    {
        if ($salles->isEmpty()) {
            return null;
        }

        $index = $salles->search(fn ($salle) => (int) $salle->id_salle === $requestedSalleId);

        if ($index === false) {
            return null;
        }

        return (int) $index + 1;
    }

    private function salleIndexFromGrille($codeGrille): int
    {
        $str = str_pad((string) ($codeGrille ?? ''), 7, '0', STR_PAD_LEFT);
        $digit = (int) ($str[3] ?? 1);

        return $digit >= 1 ? $digit : 1;
    }

    private function formatDuration(Examen $examen): string
    {
        if (! $examen->date_debut || ! $examen->date_fin) {
            return '-';
        }

        $minutes = $examen->date_debut->diffInMinutes($examen->date_fin);
        $hours = intdiv($minutes, 60);
        $remainingMinutes = $minutes % 60;

        return sprintf('%02dh%02d', $hours, $remainingMinutes);
    }

    private function studentKey($repartition): ?string
    {
        $studentId = $repartition->inscriptionPedagogique?->inscriptionAdministrative?->id_etudiant;
        $fallbackId = $repartition->id_inscription_pedagogique;
        $key = $studentId ?? $fallbackId;

        return $key ? (string) $key : null;
    }
}
