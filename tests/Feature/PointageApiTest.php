<?php

namespace Tests\Feature;

use App\Models\AnneeUniversitaire;
use App\Models\Etudiant;
use App\Models\Examen;
use App\Models\Filiere;
use App\Models\InscriptionAdministrative;
use App\Models\InscriptionPedagogique;
use App\Models\Module;
use App\Models\Niveau;
use App\Models\OffreFormation;
use App\Models\RepartitionEtudiant;
use App\Models\Salle;
use App\Models\Section;
use App\Models\Semestre;
use App\Models\SessionExamen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class PointageApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('pointage.token', 'pointage-secret');
    }

    public function test_pointage_api_requires_token(): void
    {
        ['exam' => $exam] = $this->createPointageFixture();

        $this->getJson("/api/pointage/examens/{$exam->id_examen}/repartitions")
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthorized.');
    }

    public function test_pointage_api_exposes_exam_repartitions(): void
    {
        [
            'exam' => $exam,
            'student' => $student,
            'repartition' => $repartition,
        ] = $this->createPointageFixture([
            'present' => true,
            'heure_arrivee' => '08:05:00',
            'heure_sortie' => '10:00:00',
        ]);

        $this->withHeader('X-Pointage-Token', 'pointage-secret')
            ->getJson("/api/pointage/examens/{$exam->id_examen}/repartitions")
            ->assertOk()
            ->assertJsonPath('data.exam.id_examen', $exam->id_examen)
            ->assertJsonPath('data.exam.module.code_module', $exam->module->code_module)
            ->assertJsonPath('data.repartitions.0.id_repartition', $repartition->id_repartition)
            ->assertJsonPath('data.repartitions.0.student.cne', $student->cne)
            ->assertJsonPath('data.repartitions.0.present', true)
            ->assertJsonPath('data.repartitions.0.date_debut', '2026-06-10 08:05:00')
            ->assertJsonPath('data.repartitions.0.date_fin', '2026-06-10 10:00:00');
    }

    public function test_pointage_api_updates_attendance_data(): void
    {
        ['exam' => $exam, 'repartition' => $repartition] = $this->createPointageFixture([
            'present' => false,
            'heure_arrivee' => null,
            'heure_sortie' => null,
        ]);

        $this->withToken('pointage-secret')
            ->postJson("/api/pointage/examens/{$exam->id_examen}/repartitions", [
                'repartitions' => [
                    [
                        'id_repartition' => $repartition->id_repartition,
                        'present' => true,
                        'date_debut' => '2026-06-10 08:15:00',
                        'date_fin' => '2026-06-10 10:05:00',
                        'observation' => 'Badge confirme',
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Pointage data synced.')
            ->assertJsonPath('data.repartitions.0.present', true)
            ->assertJsonPath('data.repartitions.0.date_debut', '2026-06-10 08:15:00')
            ->assertJsonPath('data.repartitions.0.date_fin', '2026-06-10 10:05:00');

        $this->assertDatabaseHas('repartition_etudiants', [
            'id_repartition' => $repartition->id_repartition,
            'present' => true,
            'heure_arrivee' => '08:15:00',
            'heure_sortie' => '10:05:00',
            'observation' => 'Badge confirme',
        ]);
    }

    public function test_pointage_api_rejects_repartitions_from_another_exam(): void
    {
        ['exam' => $exam] = $this->createPointageFixture();
        ['repartition' => $otherRepartition] = $this->createPointageFixture();

        $this->withToken('pointage-secret')
            ->patchJson("/api/pointage/examens/{$exam->id_examen}/repartitions", [
                'repartitions' => [
                    [
                        'id_repartition' => $otherRepartition->id_repartition,
                        'present' => true,
                    ],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('repartitions');
    }

    private function createPointageFixture(array $repartitionOverrides = []): array
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create();
        $section = Section::factory()->create(['id_filiere' => $filiere->id_filiere]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create(['nom_module' => 'Anatomie']);
        $offre = OffreFormation::factory()->create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'nom_affiche' => 'Anatomie',
        ]);
        $session = SessionExamen::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Normale',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
        ]);
        $salle = Salle::factory()->create(['nom_salle' => 'Salle A101']);
        $exam = Examen::factory()->create([
            'id_session_examen' => $session->id_session_examen,
            'id_offre' => $offre->id_offre,
            'id_module' => $module->id_module,
            'id_salle' => $salle->id_salle,
            'date_examen' => '2026-06-10',
            'date_debut' => '2026-06-10 08:00:00',
            'date_fin' => '2026-06-10 10:00:00',
            'statut' => 'Planifiee',
        ]);
        $exam->salles()->sync([$salle->id_salle]);

        $student = Etudiant::factory()->create(['id_section' => $section->id_section]);
        $admin = InscriptionAdministrative::factory()->create([
            'id_etudiant' => $student->id_etudiant,
            'id_annee' => $annee->id_annee,
            'id_niveau' => $niveau->id_niveau,
            'id_section' => $section->id_section,
            'statut' => 'Active',
        ]);
        $inscription = InscriptionPedagogique::factory()->create([
            'id_inscription_admin' => $admin->id_inscription_admin,
            'id_offre' => $offre->id_offre,
            'type_inscription' => 'Normal',
        ]);
        $repartition = RepartitionEtudiant::factory()->create(array_merge([
            'id_examen' => $exam->id_examen,
            'id_inscription_pedagogique' => $inscription->id_inscription_pedagogique,
            'code_grille' => 1001,
            'code_anonymat' => '9001',
            'numero_place' => 'A101-001',
            'present' => false,
            'heure_arrivee' => null,
            'heure_sortie' => null,
            'observation' => null,
        ], $repartitionOverrides));

        return [
            'exam' => $exam->fresh(['module']),
            'student' => $student,
            'repartition' => $repartition,
        ];
    }
}
