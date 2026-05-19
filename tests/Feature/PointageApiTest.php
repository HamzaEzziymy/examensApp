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
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
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
            'annee' => $annee,
            'filiere' => $filiere,
            'niveau' => $niveau,
        ] = $this->createPointageFixture([
            'present' => true,
            'heure_arrivee' => '08:05:00',
            'heure_sortie' => '10:00:00',
        ]);

        $this->withHeader('X-Pointage-Token', 'pointage-secret')
            ->getJson("/api/pointage/examens/{$exam->id_examen}/repartitions")
            ->assertOk()
            ->assertJsonPath('data.exam.id_examen', $exam->id_examen)
            ->assertJsonPath('data.exam.annee.id_annee', $annee->id_annee)
            ->assertJsonPath('data.exam.filiere.id_filiere', $filiere->id_filiere)
            ->assertJsonPath('data.exam.niveau.id_niveau', $niveau->id_niveau)
            ->assertJsonPath('data.exam.module.code_module', $exam->module->code_module)
            ->assertJsonPath('data.students.0.id_repartition', $repartition->id_repartition)
            ->assertJsonPath('data.students.0.cne', $student->cne)
            ->assertJsonPath('data.repartitions.0.id_repartition', $repartition->id_repartition)
            ->assertJsonPath('data.repartitions.0.student.cne', $student->cne)
            ->assertJsonPath('data.repartitions.0.present', true)
            ->assertJsonPath('data.repartitions.0.date_debut', '2026-06-10 08:05:00')
            ->assertJsonPath('data.repartitions.0.date_fin', '2026-06-10 10:00:00');
    }

    public function test_pointage_api_can_limit_the_payload_with_include(): void
    {
        [
            'exam' => $exam,
            'student' => $student,
        ] = $this->createPointageFixture();

        $this->withHeader('X-Pointage-Token', 'pointage-secret')
            ->getJson("/api/pointage/examens/{$exam->id_examen}/repartitions?include=exam,students")
            ->assertOk()
            ->assertJsonPath('data.exam.id_examen', $exam->id_examen)
            ->assertJsonPath('data.students.0.cne', $student->cne)
            ->assertJsonMissingPath('data.repartitions');
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

    public function test_repartition_can_be_pushed_to_external_pointage_app(): void
    {
        [
            'exam' => $exam,
            'student' => $student,
        ] = $this->createPointageFixture();

        Config::set('pointage.external_url', "https://pointage.example/api/examens/{id_examen}/repartitions");
        Config::set('pointage.external_token', 'external-secret');
        $expectedUrl = "https://pointage.example/api/examens/{$exam->id_examen}/repartitions";

        Http::fake([
            $expectedUrl => Http::response(['ok' => true], 201),
        ]);

        $this->postJson(route('surveillance.repartition-etudiants.push-pointage', $exam))
            ->assertOk()
            ->assertJsonPath('message', 'Repartition envoyee au pointage.')
            ->assertJsonPath('external_status', 201)
            ->assertJsonPath('sent.id_examen', $exam->id_examen)
            ->assertJsonPath('sent.examens', 1)
            ->assertJsonPath('sent.students', 1);

        Http::assertSent(function (HttpRequest $request) use ($expectedUrl, $exam, $student) {
            $payload = $request->data();
            $authorization = $request->header('Authorization');
            $authorization = is_array($authorization) ? $authorization : [$authorization];

            return strtoupper($request->method()) === 'POST'
                && $request->url() === $expectedUrl
                && in_array('Bearer external-secret', $authorization, true)
                && data_get($payload, 'source') === 'app_repartition_examens'
                && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', (string) data_get($payload, 'generated_at')) === 1
                && data_get($payload, 'examens.0.examen_code') === 'EXAM-'.$exam->offreFormation->module->code_module.'-'.$exam->offreFormation->semestre->code_semestre
                && data_get($payload, 'examens.0.examen_libelle') === 'Examen Anatomie '.$exam->offreFormation->semestre->code_semestre
                && data_get($payload, 'examens.0.session') === 'Normale'
                && data_get($payload, 'examens.0.salle_code') === $exam->salle->code_salle
                && data_get($payload, 'examens.0.salle_nom') === $exam->salle->nom_salle
                && data_get($payload, 'examens.0.etudiants.0.cne') === $student->cne
                && data_get($payload, 'examens.0.etudiants.0.device_user_id') === (string) $student->id_etudiant
                && data_get($payload, 'examens.0.etudiants.0.autorise') === true;
        });
    }

    public function test_repartition_push_requires_external_url(): void
    {
        ['exam' => $exam] = $this->createPointageFixture();

        Config::set('pointage.external_url', '');

        Http::fake();

        $this->postJson(route('surveillance.repartition-etudiants.push-pointage', $exam))
            ->assertUnprocessable()
            ->assertJsonPath('message', 'POINTAGE_EXTERNAL_URL n est pas configure.');

        Http::assertNothingSent();
    }

    private function createPointageFixture(array $repartitionOverrides = []): array
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create();
        $section = Section::factory()->create(['id_filiere' => $filiere->id_filiere]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'code_semestre' => 'S'.fake()->unique()->numberBetween(1, 99),
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'ANA-'.fake()->unique()->numberBetween(1, 999),
            'nom_module' => 'Anatomie',
        ]);
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
        $salle = Salle::factory()->create([
            'code_salle' => 'AMPHI-'.fake()->unique()->numberBetween(1, 999),
            'nom_salle' => 'Amphi A1',
        ]);
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
            'exam' => $exam->fresh(['module', 'offreFormation.module', 'offreFormation.semestre', 'salle']),
            'annee' => $annee,
            'filiere' => $filiere,
            'niveau' => $niveau,
            'student' => $student,
            'repartition' => $repartition,
        ];
    }
}
