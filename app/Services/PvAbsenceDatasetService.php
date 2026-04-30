<?php

namespace App\Services;

use App\Models\Examen;
use Illuminate\Support\Collection;

class PvAbsenceDatasetService
{
    public function __construct(
        private readonly PvAbsencePageBuilder $pvAbsencePageBuilder
    ) {
    }

    public function buildPages(array $filters, ?Collection $allowedStudentKeys = null): Collection
    {
        $requestedSalleId = (int) ($filters['salle_id'] ?? 0);
        $requestedModuleId = ! empty($filters['module_id']) ? (int) $filters['module_id'] : null;
        $sessionId = (int) ($filters['session_id'] ?? 0);
        $sectionId = (int) ($filters['section_id'] ?? 0);
        $niveauId = (int) ($filters['niveau_id'] ?? 0);
        $anneeId = ! empty($filters['annee_id']) ? (int) $filters['annee_id'] : null;

        if ($requestedSalleId < 1 || $sessionId < 1 || $sectionId < 1 || $niveauId < 1) {
            return collect();
        }

        $examens = Examen::query()
            ->with([
                'module' => fn ($query) => $query->select([
                    'modules.id_module',
                    'modules.code_module',
                    'modules.nom_module',
                ]),
                'sessionExamen:id_session_examen,nom_session,type_session,id_filiere,id_annee',
                'salle:id_salle,code_salle,nom_salle',
                'salles:id_salle,code_salle,nom_salle',
                'offreFormation:id_offre,id_module,id_section,id_semestre,id_annee',
                'offreFormation.section:id_section,id_filiere,nom_section',
                'offreFormation.section.filiere:id_filiere,nom_filiere',
                'offreFormation.semestre:id_semestre,id_niveau,nom_semestre',
                'offreFormation.semestre.niveau:id_niveau,nom_niveau',
                'repartitions' => fn ($query) => $query
                    ->with([
                        'inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                        'inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                        'inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom,cne',
                    ])
                    ->orderBy('code_grille')
                    ->orderBy('numero_place'),
                'absences' => fn ($query) => $query
                    ->with([
                        'anonymat:id_anonymat,id_inscription_pedagogique',
                    ])
                    ->orderBy('date_absence'),
            ])
            ->where('id_session_examen', $sessionId)
            ->whereHas('offreFormation', function ($query) use ($sectionId, $anneeId, $niveauId) {
                $query->where('id_section', $sectionId);

                if ($anneeId) {
                    $query->where('id_annee', $anneeId);
                }

                $query->whereHas('semestre', function ($semesterQuery) use ($niveauId) {
                    $semesterQuery->where('id_niveau', $niveauId);
                });
            })
            ->when($requestedModuleId, function ($query) use ($requestedModuleId) {
                $query->where('id_module', $requestedModuleId);
            })
            ->where(function ($query) use ($requestedSalleId) {
                $query->where('id_salle', $requestedSalleId)
                    ->orWhereHas('salles', function ($roomQuery) use ($requestedSalleId) {
                        $roomQuery->where('salles.id_salle', $requestedSalleId);
                    });
            })
            ->orderBy('date_examen')
            ->orderBy('date_debut')
            ->orderBy('id_examen')
            ->get();

        return $this->pvAbsencePageBuilder->build($examens, $requestedSalleId, null, null, $allowedStudentKeys);
    }
}
