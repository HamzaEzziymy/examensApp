<?php

namespace App\Services;

use App\Models\ModuleValidationRule;
use Illuminate\Support\Collection;

class ModuleValidationRuleService
{
    public function rulesForFiliere(?int $filiereId): Collection
    {
        if (! $filiereId) {
            return collect();
        }

        return ModuleValidationRule::query()
            ->with('module:id_module,code_module,nom_module')
            ->where('id_filiere', $filiereId)
            ->get()
            ->keyBy('id_module');
    }

    public function evaluate(?float $moduleAverage, Collection $elements, ?ModuleValidationRule $rule, ?string $fallbackStatus = null): array
    {
        $normalizedFallback = strtolower(trim((string) $fallbackStatus));

        if ($moduleAverage === null) {
            return [
                'status' => $fallbackStatus ?: 'En cours',
                'module_threshold' => $rule?->module_pass_threshold ?? 10.0,
                'element_threshold' => $rule?->element_pass_threshold ?? $rule?->module_pass_threshold ?? 10.0,
                'has_custom_rule' => (bool) $rule,
            ];
        }

        $moduleThreshold = (float) ($rule?->module_pass_threshold ?? 10.0);
        $elementThreshold = (float) ($rule?->element_pass_threshold ?? $moduleThreshold);
        $passesAverage = $moduleAverage >= $moduleThreshold;

        $passesElements = true;
        if ($rule?->enforce_all_elements_threshold) {
            $evaluatedElements = $elements
                ->filter(function (array $element) {
                    return ($element['type_element'] ?? null) !== null || ($element['nom_element'] ?? null) !== null;
                })
                ->values();

            $passesElements = $evaluatedElements->isNotEmpty()
                && $evaluatedElements->every(function (array $element) use ($elementThreshold) {
                    $score = $element['moyenne_element'] ?? null;

                    return $score !== null && $score !== '' && (float) $score >= $elementThreshold;
                });
        }

        if ($passesAverage && $passesElements) {
            $status = in_array($normalizedFallback, ['capitalise', 'capitalisé'], true)
                ? 'Capitalise'
                : 'Valide';
        } else {
            $status = match ($normalizedFallback) {
                'rattrapage', 'r', 'ratt' => 'Rattrapage',
                'en dette', 'dette' => 'En dette',
                default => 'Non Valide',
            };
        }

        return [
            'status' => $status,
            'module_threshold' => $moduleThreshold,
            'element_threshold' => $elementThreshold,
            'has_custom_rule' => (bool) $rule,
        ];
    }
}
