<?php

namespace App\Http\Controllers\Concerns;

use App\Models\SessionExamen;
use Illuminate\Support\Collection;

trait FiltersEligibleExamRegistrations
{
    private function filterRegistrationsForSession(Collection $registrations, int $moduleId, ?SessionExamen $session): Collection
    {
        if (! $this->isRattrapageSession($session)) {
            return $registrations->values();
        }

        return $registrations
            ->filter(function ($registration) use ($moduleId) {
                return $this->isRattrapageResultStatus(
                    $this->latestModuleResultStatus($registration, $moduleId)
                );
            })
            ->values();
    }

    private function noEligibleRegistrationsMessage(?SessionExamen $session): string
    {
        if ($this->isRattrapageSession($session)) {
            return 'Aucun etudiant n\'est eligible au rattrapage pour ce module. Le resultat du module doit avoir le statut Rattrapage, R ou ratt.';
        }

        return 'Aucun etudiant inscrit pour ce module dans l\'annee academique de la session choisie. Creez les inscriptions pedagogiques avant de planifier cet examen.';
    }

    private function isRattrapageSession(?SessionExamen $session): bool
    {
        $value = $this->normalizedEligibilityValue($session?->type_session ?? $session?->nom_session);

        return $value === 'r' || str_starts_with($value, 'ratt');
    }

    private function isRattrapageResultStatus(?string $status): bool
    {
        $value = $this->normalizedEligibilityValue($status);

        return $value === 'r' || str_starts_with($value, 'ratt');
    }

    private function latestModuleResultStatus($registration, int $moduleId): ?string
    {
        return collect($registration->resultatsModules ?? [])
            ->filter(fn ($resultat) => (int) ($resultat->id_module ?? 0) === $moduleId)
            ->sortByDesc(function ($resultat) {
                return sprintf(
                    '%s|%010d',
                    (string) ($resultat->date_validation ?? ''),
                    (int) ($resultat->id_resultat_module ?? 0)
                );
            })
            ->first()?->statut;
    }

    private function normalizedEligibilityValue(?string $value): string
    {
        $normalized = strtolower(trim((string) $value));

        return (string) preg_replace('/[^a-z]/', '', $normalized);
    }
}
