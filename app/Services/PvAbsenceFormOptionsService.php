<?php

namespace App\Services;

use App\Models\Filiere;
use App\Models\Niveau;
use App\Models\OffreFormation;
use App\Models\Salle;
use App\Models\Section;
use App\Models\SessionExamen;
use Illuminate\Support\Collection;

class PvAbsenceFormOptionsService
{
    public function payload(): array
    {
        return [
            'sessions' => SessionExamen::select('id_session_examen', 'nom_session', 'id_filiere', 'id_annee')
                ->orderBy('nom_session')
                ->get(),
            'niveaux' => Niveau::select('id_niveau', 'nom_niveau')
                ->orderBy('nom_niveau')
                ->get(),
            'salles' => Salle::select('id_salle', 'code_salle', 'nom_salle')
                ->where('est_disponible', true)
                ->orderBy('code_salle')
                ->get(),
            'modules' => $this->moduleOptions(),
            'filieres' => Filiere::select('id_filiere', 'nom_filiere')
                ->orderBy('nom_filiere')
                ->get(),
            'sections' => Section::select('id_section', 'nom_section', 'id_filiere')
                ->orderBy('nom_section')
                ->get(),
        ];
    }

    private function moduleOptions(): Collection
    {
        return OffreFormation::query()
            ->with([
                'module:id_module,code_module,nom_module',
                'section:id_section,id_filiere',
                'semestre:id_semestre,id_niveau',
            ])
            ->get(['id_offre', 'id_module', 'id_section', 'id_semestre', 'id_annee'])
            ->groupBy('id_module')
            ->map(function (Collection $offres) {
                $module = $offres->first()?->module;

                if (! $module) {
                    return null;
                }

                return [
                    'id_module' => (int) $module->id_module,
                    'code_module' => $module->code_module,
                    'nom_module' => $module->nom_module,
                    'label' => trim(collect([$module->code_module, $module->nom_module])->filter()->implode(' - ')),
                    'filiere_ids' => $offres->pluck('section.id_filiere')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all(),
                    'section_ids' => $offres->pluck('id_section')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all(),
                    'niveau_ids' => $offres->pluck('semestre.id_niveau')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all(),
                    'annee_ids' => $offres->pluck('id_annee')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all(),
                ];
            })
            ->filter()
            ->sortBy('label')
            ->values();
    }
}
