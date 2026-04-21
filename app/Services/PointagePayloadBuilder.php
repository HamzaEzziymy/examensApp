<?php

namespace App\Services;

use App\Models\Examen;
use App\Models\RepartitionEtudiant;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PointagePayloadBuilder
{
    public function build(Examen $examen, array|Collection $includes = ['exam', 'students', 'repartitions']): array
    {
        $includes = collect($includes)->values();
        $this->loadPointageRelations($examen);

        $repartitions = $examen->repartitions
            ->sortBy([
                ['code_grille', 'asc'],
                ['numero_place', 'asc'],
            ])
            ->values()
            ->map(fn (RepartitionEtudiant $repartition) => $this->formatRepartition($examen, $repartition));

        $data = [];

        if ($includes->contains('exam')) {
            $data['exam'] = $this->formatExam($examen);
        }

        if ($includes->contains('students')) {
            $data['students'] = $repartitions
                ->map(fn (array $repartition) => $this->formatStudentAssignment($repartition))
                ->values();
        }

        if ($includes->contains('repartitions')) {
            $data['repartitions'] = $repartitions;
        }

        return $data;
    }

    public function parseIncludes(?string $include): Collection
    {
        $allowed = collect(['exam', 'students', 'repartitions']);
        $include = trim((string) $include);

        if ($include === '') {
            return $allowed;
        }

        $requested = collect(explode(',', $include))
            ->map(fn ($value) => trim($value))
            ->filter()
            ->intersect($allowed)
            ->values();

        return $requested->isNotEmpty() ? $requested : $allowed;
    }

    public function loadPointageRelations(Examen $examen, bool $withRepartitions = true): void
    {
        $relations = [
            'module' => fn ($query) => $query->select('modules.id_module', 'modules.code_module', 'modules.nom_module'),
            'element:id_element,id_module,code_element,nom_element',
            'sessionExamen:id_session_examen,id_filiere,id_annee,nom_session,type_session,date_session_examen',
            'sessionExamen.anneeUniversitaire:id_annee,annee_univ,date_debut,date_fin,est_active',
            'sessionExamen.filiere:id_filiere,nom_filiere',
            'offreFormation:id_offre,id_module,id_semestre,id_section,id_annee,nom_affiche',
            'offreFormation.anneeUniversitaire:id_annee,annee_univ,date_debut,date_fin,est_active',
            'offreFormation.section:id_section,id_filiere,nom_section,langue',
            'offreFormation.section.filiere:id_filiere,nom_filiere',
            'offreFormation.semestre:id_semestre,id_niveau,code_semestre,nom_semestre,ordre',
            'offreFormation.semestre.niveau:id_niveau,code_niveau,nom_niveau,ordre',
            'salle:id_salle,code_salle,nom_salle',
            'salles:id_salle,code_salle,nom_salle',
        ];

        if ($withRepartitions) {
            $relations = array_merge($relations, [
                'repartitions.inscriptionPedagogique:id_inscription_pedagogique,id_inscription_admin,id_offre,type_inscription',
                'repartitions.inscriptionPedagogique.inscriptionAdministrative:id_inscription_admin,id_etudiant',
                'repartitions.inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,cne,nom,prenom',
            ]);
        }

        $examen->load($relations);
    }

    public function formatExam(Examen $examen): array
    {
        $offre = $examen->offreFormation;
        $session = $examen->sessionExamen;
        $annee = $session?->anneeUniversitaire ?: $offre?->anneeUniversitaire;
        $filiere = $session?->filiere ?: $offre?->section?->filiere;
        $semestre = $offre?->semestre;
        $niveau = $semestre?->niveau;
        $section = $offre?->section;

        return [
            'id_examen' => $examen->id_examen,
            'annee' => $annee ? [
                'id_annee' => $annee->id_annee,
                'annee_univ' => $annee->annee_univ,
                'date_debut' => $annee->date_debut,
                'date_fin' => $annee->date_fin,
            ] : null,
            'filiere' => $filiere ? [
                'id_filiere' => $filiere->id_filiere,
                'nom_filiere' => $filiere->nom_filiere,
            ] : null,
            'session' => [
                'id_session_examen' => $session?->id_session_examen,
                'id_filiere' => $session?->id_filiere,
                'id_annee' => $session?->id_annee,
                'nom_session' => $session?->nom_session,
                'type_session' => $session?->type_session,
                'date_session_examen' => $session?->date_session_examen,
            ],
            'niveau' => $niveau ? [
                'id_niveau' => $niveau->id_niveau,
                'code_niveau' => $niveau->code_niveau,
                'nom_niveau' => $niveau->nom_niveau,
                'ordre' => $niveau->ordre,
            ] : null,
            'semestre' => $semestre ? [
                'id_semestre' => $semestre->id_semestre,
                'code_semestre' => $semestre->code_semestre,
                'nom_semestre' => $semestre->nom_semestre,
                'ordre' => $semestre->ordre,
            ] : null,
            'section' => $section ? [
                'id_section' => $section->id_section,
                'nom_section' => $section->nom_section,
                'langue' => $section->langue,
            ] : null,
            'offre' => $offre ? [
                'id_offre' => $offre->id_offre,
                'nom_affiche' => $offre->nom_affiche,
            ] : null,
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

    public function formatStudentAssignment(array $repartition): array
    {
        return [
            'id_repartition' => $repartition['id_repartition'],
            'id_examen' => $repartition['id_examen'],
            'id_inscription_pedagogique' => $repartition['id_inscription_pedagogique'],
            'id_etudiant' => $repartition['student']['id_etudiant'],
            'cne' => $repartition['student']['cne'],
            'nom' => $repartition['student']['nom'],
            'prenom' => $repartition['student']['prenom'],
            'type_inscription' => $repartition['type_inscription'],
            'code_grille' => $repartition['code_grille'],
            'code_anonymat' => $repartition['code_anonymat'],
            'numero_place' => $repartition['numero_place'],
            'salle_index' => $repartition['salle_index'],
            'salle' => $repartition['salle'],
            'present' => $repartition['present'],
            'date_debut' => $repartition['date_debut'],
            'date_fin' => $repartition['date_fin'],
            'observation' => $repartition['observation'],
        ];
    }

    public function formatRepartition(Examen $examen, RepartitionEtudiant $repartition): array
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
