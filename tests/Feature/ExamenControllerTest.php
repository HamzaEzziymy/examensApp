<?php

namespace Tests\Feature;

use App\Models\AnneeUniversitaire;
use App\Models\Anonymat;
use App\Models\ElementModule;
use App\Models\Etudiant;
use App\Models\Examen;
use App\Models\Filiere;
use App\Models\InscriptionAdministrative;
use App\Models\InscriptionPedagogique;
use App\Models\Module;
use App\Models\Niveau;
use App\Models\OffreFormation;
use App\Models\RepartitionEtudiant;
use App\Models\ResultatModule;
use App\Models\Salle;
use App\Models\Section;
use App\Models\Semestre;
use App\Models\SessionExamen;
use App\Models\User;
use App\Models\UserFiliereAnnee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamenControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_exposes_all_sessions_for_the_selected_year_in_exam_planning(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $selectedFiliere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $otherFiliere = Filiere::factory()->create(['nom_filiere' => 'Pharmacie']);

        UserFiliereAnnee::create([
            'user_id' => $user->id,
            'id_filiere' => $selectedFiliere->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        SessionExamen::create([
            'id_filiere' => $selectedFiliere->id_filiere,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session medecine',
            'type_session' => 'Rattrapage',
            'date_session_examen' => '2026-07-01',
            'quadrimestre' => 2,
        ]);

        SessionExamen::create([
            'id_filiere' => $otherFiliere->id_filiere,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session pharmacie',
            'type_session' => 'Rattrapage',
            'date_session_examen' => '2026-07-02',
            'quadrimestre' => 2,
        ]);

        $response = $this
            ->actingAs($user)
            ->get(route('examens.examens.index'));

        $response
            ->assertOk()
            ->assertSee('Session commune')
            ->assertSee('Session medecine')
            ->assertSee('Session pharmacie');
    }

    public function test_store_plans_an_exam_for_a_shared_session_using_pedagogical_offers(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create(['id_filiere' => $filiere->id_filiere]);
        $niveau = Niveau::factory()->create();
        $semestre = Semestre::factory()->create(['id_niveau' => $niveau->id_niveau]);
        $module = Module::factory()->create();
        $salle = Salle::factory()->create([
            'capacite' => 60,
            'capacite_examens' => 60,
        ]);

        UserFiliereAnnee::create([
            'user_id' => $user->id,
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Offre module commune',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Normale Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-10',
            'quadrimestre' => 2,
        ]);

        $etudiant = Etudiant::factory()->create([
            'id_section' => $section->id_section,
        ]);

        $inscriptionAdministrative = InscriptionAdministrative::create([
            'id_etudiant' => $etudiant->id_etudiant,
            'id_annee' => $annee->id_annee,
            'id_niveau' => $niveau->id_niveau,
            'id_section' => null,
            'date_inscription' => '2026-01-15',
            'statut' => 'Active',
            'type_inscription' => 'nouveau',
        ]);

        $inscriptionPedagogique = InscriptionPedagogique::create([
            'id_inscription_admin' => $inscriptionAdministrative->id_inscription_admin,
            'id_offre' => $offre->id_offre,
            'type_inscription' => 'Normal',
            'credits_acquis' => 0,
        ]);

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'id_module' => $module->id_module,
                'salles' => [$salle->id_salle],
                'date_examen' => '2026-06-20',
                'date_debut' => '2026-06-20 08:00:00',
                'date_fin' => '2026-06-20 10:00:00',
                'statut' => 'Planifiee',
                'description' => 'Examen commun',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $examen = Examen::query()->latest('id_examen')->first();

        $this->assertNotNull($examen);
        $this->assertDatabaseHas('examens', [
            'id_examen' => $examen->id_examen,
            'id_session_examen' => $session->id_session_examen,
            'id_module' => $module->id_module,
        ]);
        $this->assertDatabaseHas('repartition_etudiants', [
            'id_examen' => $examen->id_examen,
            'id_inscription_pedagogique' => $inscriptionPedagogique->id_inscription_pedagogique,
        ]);
    }

    public function test_store_plans_rattrapage_exam_only_for_students_with_matching_result_status_aliases(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'offre' => $offre,
            'module' => $module,
            'salle' => $salle,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $session->update([
            'nom_session' => 'Session de Rattrapage',
            'type_session' => 'Rattrapage',
        ]);

        $eligibleRattrapage = $this->createPedagogicalRegistration($section, $annee, $niveau, $offre, 'Alpha', 'Rattrapage');
        $eligibleLatestRattrapage = $this->createPedagogicalRegistration($section, $annee, $niveau, $offre, 'Beta', 'LatestRattrapage');
        $ineligibleLatestValide = $this->createPedagogicalRegistration($section, $annee, $niveau, $offre, 'Gamma', 'LatestValide');
        $withoutResult = $this->createPedagogicalRegistration($section, $annee, $niveau, $offre, 'Delta', 'SansResultat');

        $this->createModuleResult($eligibleRattrapage, $module, 'Rattrapage', '2026-06-30');
        $this->createModuleResult($eligibleLatestRattrapage, $module, 'Valide', '2026-06-10');
        $this->createModuleResult($eligibleLatestRattrapage, $module, 'Rattrapage', '2026-06-30');
        $this->createModuleResult($ineligibleLatestValide, $module, 'Rattrapage', '2026-06-10');
        $this->createModuleResult($ineligibleLatestValide, $module, 'Valide', '2026-06-30');

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'id_module' => $module->id_module,
                'salles' => [$salle->id_salle],
                'date_examen' => '2026-07-20',
                'date_debut' => '2026-07-20 08:00:00',
                'date_fin' => '2026-07-20 10:00:00',
                'statut' => 'Planifiee',
                'description' => 'Examen rattrapage',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $examen = Examen::query()->latest('id_examen')->first();

        $this->assertNotNull($examen);
        $this->assertSame(
            [
                $eligibleRattrapage->id_inscription_pedagogique,
                $eligibleLatestRattrapage->id_inscription_pedagogique,
            ],
            RepartitionEtudiant::query()
                ->where('id_examen', $examen->id_examen)
                ->orderBy('id_inscription_pedagogique')
                ->pluck('id_inscription_pedagogique')
                ->all()
        );
        $this->assertDatabaseMissing('repartition_etudiants', [
            'id_examen' => $examen->id_examen,
            'id_inscription_pedagogique' => $ineligibleLatestValide->id_inscription_pedagogique,
        ]);
        $this->assertDatabaseMissing('repartition_etudiants', [
            'id_examen' => $examen->id_examen,
            'id_inscription_pedagogique' => $withoutResult->id_inscription_pedagogique,
        ]);
    }

    public function test_eligible_student_count_returns_the_real_count_for_the_selected_session_and_module(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'offre' => $offre,
            'module' => $module,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $session->update([
            'nom_session' => 'Session de Rattrapage',
            'type_session' => 'Rattrapage',
        ]);

        $eligibleRattrapage = $this->createPedagogicalRegistration($section, $annee, $niveau, $offre, 'Alpha', 'Rattrapage');
        $eligibleLatestRattrapage = $this->createPedagogicalRegistration($section, $annee, $niveau, $offre, 'Beta', 'LatestRattrapage');
        $ineligibleLatestValide = $this->createPedagogicalRegistration($section, $annee, $niveau, $offre, 'Gamma', 'LatestValide');

        $this->createModuleResult($eligibleRattrapage, $module, 'Rattrapage', '2026-06-30');
        $this->createModuleResult($eligibleLatestRattrapage, $module, 'Valide', '2026-06-10');
        $this->createModuleResult($eligibleLatestRattrapage, $module, 'Rattrapage', '2026-06-30');
        $this->createModuleResult($ineligibleLatestValide, $module, 'Rattrapage', '2026-06-10');
        $this->createModuleResult($ineligibleLatestValide, $module, 'Valide', '2026-06-30');

        $response = $this
            ->actingAs($user)
            ->getJson(route('examens.planning.student-count', [
                'id_session_examen' => $session->id_session_examen,
                'id_module' => $module->id_module,
            ]));

        $response
            ->assertOk()
            ->assertJson([
                'count' => 2,
                'session_type' => 'Rattrapage',
            ]);
    }

    public function test_eligible_student_count_returns_aggregated_counts_for_bulk_module_selection(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'semestre' => $semestre,
            'module' => $firstModule,
            'offre' => $firstOffre,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $secondModule = Module::factory()->create();
        $secondOffre = OffreFormation::create([
            'id_module' => $secondModule->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Deuxieme offre module commune',
        ]);

        $this->createPedagogicalRegistration($section, $annee, $niveau, $firstOffre, 'Alpha', 'A');
        $this->createPedagogicalRegistration($section, $annee, $niveau, $firstOffre, 'Beta', 'B');
        $this->createPedagogicalRegistration($section, $annee, $niveau, $secondOffre, 'Gamma', 'C');

        $response = $this
            ->actingAs($user)
            ->getJson(route('examens.planning.student-count', [
                'id_session_examen' => $session->id_session_examen,
                'module_ids' => [$firstModule->id_module, $secondModule->id_module],
            ]));

        $response
            ->assertOk()
            ->assertJson([
                'count' => 3,
                'unique_count' => 3,
                'session_type' => 'Normale',
            ])
            ->assertJsonPath('modules.0.id_module', $firstModule->id_module)
            ->assertJsonPath('modules.0.count', 2)
            ->assertJsonPath('modules.1.id_module', $secondModule->id_module)
            ->assertJsonPath('modules.1.count', 1);
    }

    public function test_eligible_student_count_can_be_filtered_by_section(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'filiere' => $filiere,
            'section' => $defaultSection,
            'niveau' => $niveau,
            'semestre' => $semestre,
            'module' => $module,
            'offre' => $defaultOffre,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $englishSection = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section anglaise',
            'langue' => 'EN',
        ]);

        $englishOffre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $englishSection->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Offre module anglais',
        ]);

        $this->createPedagogicalRegistration($defaultSection, $annee, $niveau, $defaultOffre, 'Alpha', 'FR');
        $this->createPedagogicalRegistration($englishSection, $annee, $niveau, $englishOffre, 'Beta', 'EN');

        $response = $this
            ->actingAs($user)
            ->getJson(route('examens.planning.student-count', [
                'id_session_examen' => $session->id_session_examen,
                'id_module' => $module->id_module,
                'section_id' => $englishSection->id_section,
            ]));

        $response
            ->assertOk()
            ->assertJson([
                'count' => 1,
                'unique_count' => 1,
                'session_type' => 'Normale',
            ])
            ->assertJsonPath('modules.0.id_module', $module->id_module)
            ->assertJsonPath('modules.0.count', 1);
    }

    public function test_store_can_plan_an_exam_for_a_selected_section_when_a_module_has_multiple_offers(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'filiere' => $filiere,
            'section' => $defaultSection,
            'niveau' => $niveau,
            'semestre' => $semestre,
            'module' => $module,
            'salle' => $salle,
            'offre' => $defaultOffre,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $englishSection = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section anglaise',
            'langue' => 'EN',
        ]);

        $englishOffre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $englishSection->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Offre module anglais',
        ]);

        $defaultRegistration = $this->createPedagogicalRegistration($defaultSection, $annee, $niveau, $defaultOffre, 'Alpha', 'FR');
        $englishRegistration = $this->createPedagogicalRegistration($englishSection, $annee, $niveau, $englishOffre, 'Beta', 'EN');

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'section_id' => $englishSection->id_section,
                'id_module' => $module->id_module,
                'salles' => [$salle->id_salle],
                'date_examen' => '2026-06-20',
                'date_debut' => '2026-06-20 08:00:00',
                'date_fin' => '2026-06-20 10:00:00',
                'statut' => 'Planifiee',
                'description' => 'Examen section anglaise',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $examen = Examen::query()->latest('id_examen')->first();

        $this->assertNotNull($examen);
        $this->assertSame($englishOffre->id_offre, $examen->id_offre);
        $this->assertDatabaseHas('repartition_etudiants', [
            'id_examen' => $examen->id_examen,
            'id_inscription_pedagogique' => $englishRegistration->id_inscription_pedagogique,
        ]);
        $this->assertDatabaseMissing('repartition_etudiants', [
            'id_examen' => $examen->id_examen,
            'id_inscription_pedagogique' => $defaultRegistration->id_inscription_pedagogique,
        ]);
    }

    public function test_store_can_plan_all_filtered_modules_with_a_separate_repartition_for_each_exam(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'semestre' => $semestre,
            'module' => $firstModule,
            'salle' => $salle,
            'offre' => $firstOffre,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $secondModule = Module::factory()->create();
        $secondOffre = OffreFormation::create([
            'id_module' => $secondModule->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Deuxieme offre module commune',
        ]);

        $otherSemestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'ordre' => (int) $semestre->ordre + 1,
        ]);
        $outsideModule = Module::factory()->create();
        OffreFormation::create([
            'id_module' => $outsideModule->id_module,
            'id_semestre' => $otherSemestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Offre hors semestre',
        ]);

        $firstRegistration = $this->createPedagogicalRegistration($section, $annee, $niveau, $firstOffre, 'Alpha', 'A');
        $secondRegistration = $this->createPedagogicalRegistration($section, $annee, $niveau, $secondOffre, 'Beta', 'B');
        $thirdRegistration = $this->createPedagogicalRegistration($section, $annee, $niveau, $firstOffre, 'Gamma', 'C');

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'plan_all_filtered_modules' => true,
                'salles' => [$salle->id_salle],
                'module_plannings' => [
                    [
                        'id_module' => $firstModule->id_module,
                        'date_examen' => '2026-06-20',
                        'date_debut' => '2026-06-20 08:00:00',
                        'date_fin' => '2026-06-20 10:00:00',
                    ],
                    [
                        'id_module' => $secondModule->id_module,
                        'date_examen' => '2026-06-21',
                        'date_debut' => '2026-06-21 14:00:00',
                        'date_fin' => '2026-06-21 16:00:00',
                    ],
                ],
                'statut' => 'Planifiee',
                'description' => 'Planification groupee',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $plannedExamens = Examen::query()
            ->where('id_session_examen', $session->id_session_examen)
            ->whereIn('id_module', [$firstModule->id_module, $secondModule->id_module])
            ->get()
            ->keyBy('id_module');

        $this->assertCount(2, $plannedExamens);
        $this->assertDatabaseMissing('examens', [
            'id_session_examen' => $session->id_session_examen,
            'id_module' => $outsideModule->id_module,
        ]);

        $firstExam = $plannedExamens->get($firstModule->id_module);
        $secondExam = $plannedExamens->get($secondModule->id_module);

        $this->assertNotNull($firstExam);
        $this->assertNotNull($secondExam);
        $this->assertSame('2026-06-20', $firstExam->date_examen->format('Y-m-d'));
        $this->assertSame('2026-06-21', $secondExam->date_examen->format('Y-m-d'));

        $this->assertSame(
            [
                $firstRegistration->id_inscription_pedagogique,
                $thirdRegistration->id_inscription_pedagogique,
            ],
            RepartitionEtudiant::query()
                ->where('id_examen', $firstExam->id_examen)
                ->orderBy('id_inscription_pedagogique')
                ->pluck('id_inscription_pedagogique')
                ->all()
        );

        $this->assertSame(
            [$secondRegistration->id_inscription_pedagogique],
            RepartitionEtudiant::query()
                ->where('id_examen', $secondExam->id_examen)
                ->orderBy('id_inscription_pedagogique')
                ->pluck('id_inscription_pedagogique')
                ->all()
        );
    }

    public function test_store_can_apply_anonymat_start_when_planning_all_filtered_modules(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'semestre' => $semestre,
            'module' => $firstModule,
            'salle' => $salle,
            'offre' => $firstOffre,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $secondModule = Module::factory()->create();
        $secondOffre = OffreFormation::create([
            'id_module' => $secondModule->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Deuxieme offre module commune',
        ]);

        $alphaAdmin = $this->createAdministrativeRegistration($section, $annee, $niveau, 'Alpha', 'A');
        $betaAdmin = $this->createAdministrativeRegistration($section, $annee, $niveau, 'Beta', 'B');

        $alphaFirst = $this->createPedagogicalRegistrationForAdministrative($alphaAdmin, $firstOffre);
        $alphaSecond = $this->createPedagogicalRegistrationForAdministrative($alphaAdmin, $secondOffre);
        $betaFirst = $this->createPedagogicalRegistrationForAdministrative($betaAdmin, $firstOffre);
        $betaSecond = $this->createPedagogicalRegistrationForAdministrative($betaAdmin, $secondOffre);
        $gammaFirst = $this->createPedagogicalRegistration($section, $annee, $niveau, $firstOffre, 'Gamma', 'C');
        $deltaSecond = $this->createPedagogicalRegistration($section, $annee, $niveau, $secondOffre, 'Delta', 'D');

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'plan_all_filtered_modules' => true,
                'salles' => [$salle->id_salle],
                'anonymat_start' => 2,
                'module_plannings' => [
                    [
                        'id_module' => $firstModule->id_module,
                        'date_examen' => '2026-06-20',
                        'date_debut' => '2026-06-20 08:00:00',
                        'date_fin' => '2026-06-20 10:00:00',
                    ],
                    [
                        'id_module' => $secondModule->id_module,
                        'date_examen' => '2026-06-21',
                        'date_debut' => '2026-06-21 14:00:00',
                        'date_fin' => '2026-06-21 16:00:00',
                    ],
                ],
                'statut' => 'Planifiee',
                'description' => 'Planification groupee avec anonymat',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $plannedExamens = Examen::query()
            ->where('id_session_examen', $session->id_session_examen)
            ->whereIn('id_module', [$firstModule->id_module, $secondModule->id_module])
            ->get()
            ->keyBy('id_module');

        $firstExam = $plannedExamens->get($firstModule->id_module);
        $secondExam = $plannedExamens->get($secondModule->id_module);

        $this->assertNotNull($firstExam);
        $this->assertNotNull($secondExam);
        $this->assertSame(2, $firstExam->anonymat_start);
        $this->assertSame(1, $firstExam->anonymat_end);
        $this->assertSame(2, $secondExam->anonymat_start);
        $this->assertSame(4, $secondExam->anonymat_end);

        $firstExamCodes = Anonymat::query()
            ->where('id_examen', $firstExam->id_examen)
            ->pluck('code_anonymat', 'id_inscription_pedagogique');
        $secondExamCodes = Anonymat::query()
            ->where('id_examen', $secondExam->id_examen)
            ->pluck('code_anonymat', 'id_inscription_pedagogique');

        $this->assertSame('2', $firstExamCodes[$alphaFirst->id_inscription_pedagogique]);
        $this->assertSame('2', $secondExamCodes[$alphaSecond->id_inscription_pedagogique]);
        $this->assertSame('3', $firstExamCodes[$betaFirst->id_inscription_pedagogique]);
        $this->assertSame('3', $secondExamCodes[$betaSecond->id_inscription_pedagogique]);
        $this->assertSame('1', $firstExamCodes[$gammaFirst->id_inscription_pedagogique]);
        $this->assertSame('4', $secondExamCodes[$deltaSecond->id_inscription_pedagogique]);
        $this->assertDatabaseHas('anonymat_semestres', [
            'id_inscription_admin' => $alphaAdmin->id_inscription_admin,
            'id_semestre' => $semestre->id_semestre,
            'id_annee' => $annee->id_annee,
            'code_anonymat' => '2',
        ]);
    }

    public function test_store_reuses_reserved_semester_anonymat_when_the_second_exam_is_planned_later(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'semestre' => $semestre,
            'module' => $firstModule,
            'salle' => $salle,
            'offre' => $firstOffre,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $secondModule = Module::factory()->create();
        $secondOffre = OffreFormation::create([
            'id_module' => $secondModule->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Deuxieme offre module commune',
        ]);

        $alphaAdmin = $this->createAdministrativeRegistration($section, $annee, $niveau, 'Alpha', 'A');
        $betaAdmin = $this->createAdministrativeRegistration($section, $annee, $niveau, 'Beta', 'B');
        $alphaFirst = $this->createPedagogicalRegistrationForAdministrative($alphaAdmin, $firstOffre);
        $alphaSecond = $this->createPedagogicalRegistrationForAdministrative($alphaAdmin, $secondOffre);
        $betaFirst = $this->createPedagogicalRegistrationForAdministrative($betaAdmin, $firstOffre);
        $betaSecond = $this->createPedagogicalRegistrationForAdministrative($betaAdmin, $secondOffre);

        $this->actingAs($user)->post(route('examens.examens.store'), [
            'id_session_examen' => $session->id_session_examen,
            'id_module' => $firstModule->id_module,
            'salles' => [$salle->id_salle],
            'anonymat_start' => 2,
            'date_examen' => '2026-06-20',
            'date_debut' => '2026-06-20 08:00:00',
            'date_fin' => '2026-06-20 10:00:00',
            'statut' => 'Planifiee',
            'description' => 'Premier examen semestre',
        ])->assertRedirect(route('examens.examens.index'));

        $this->actingAs($user)->post(route('examens.examens.store'), [
            'id_session_examen' => $session->id_session_examen,
            'id_module' => $secondModule->id_module,
            'salles' => [$salle->id_salle],
            'anonymat_start' => 1,
            'date_examen' => '2026-06-21',
            'date_debut' => '2026-06-21 08:00:00',
            'date_fin' => '2026-06-21 10:00:00',
            'statut' => 'Planifiee',
            'description' => 'Deuxieme examen semestre',
        ])->assertRedirect(route('examens.examens.index'));

        $firstExam = Examen::query()->where('id_module', $firstModule->id_module)->latest('id_examen')->first();
        $secondExam = Examen::query()->where('id_module', $secondModule->id_module)->latest('id_examen')->first();

        $this->assertNotNull($firstExam);
        $this->assertNotNull($secondExam);
        $this->assertSame(2, $secondExam->anonymat_start);
        $this->assertSame(1, $secondExam->anonymat_end);

        $firstExamCodes = Anonymat::query()
            ->where('id_examen', $firstExam->id_examen)
            ->pluck('code_anonymat', 'id_inscription_pedagogique');
        $secondExamCodes = Anonymat::query()
            ->where('id_examen', $secondExam->id_examen)
            ->pluck('code_anonymat', 'id_inscription_pedagogique');

        $this->assertSame('2', $firstExamCodes[$alphaFirst->id_inscription_pedagogique]);
        $this->assertSame('2', $secondExamCodes[$alphaSecond->id_inscription_pedagogique]);
        $this->assertSame('1', $firstExamCodes[$betaFirst->id_inscription_pedagogique]);
        $this->assertSame('1', $secondExamCodes[$betaSecond->id_inscription_pedagogique]);
    }

    public function test_store_preserves_semester_gaps_for_students_not_called_to_the_current_exam(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'semestre' => $semestre,
            'module' => $firstModule,
            'salle' => $salle,
            'offre' => $firstOffre,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $secondModule = Module::factory()->create();
        $secondOffre = OffreFormation::create([
            'id_module' => $secondModule->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Deuxieme offre module commune',
        ]);

        $alphaFirst = $this->createPedagogicalRegistration($section, $annee, $niveau, $firstOffre, 'Alpha', 'A');
        $gammaFirst = $this->createPedagogicalRegistration($section, $annee, $niveau, $firstOffre, 'Gamma', 'C');
        $betaAdmin = $this->createAdministrativeRegistration($section, $annee, $niveau, 'Beta', 'B');
        $betaSecond = $this->createPedagogicalRegistrationForAdministrative($betaAdmin, $secondOffre);

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'id_module' => $firstModule->id_module,
                'salles' => [$salle->id_salle],
                'anonymat_start' => 1,
                'date_examen' => '2026-06-20',
                'date_debut' => '2026-06-20 08:00:00',
                'date_fin' => '2026-06-20 10:00:00',
                'statut' => 'Planifiee',
                'description' => 'Examen avec trou de semestre',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $examen = Examen::query()->latest('id_examen')->first();

        $this->assertNotNull($examen);

        $examCodes = Anonymat::query()
            ->where('id_examen', $examen->id_examen)
            ->pluck('code_anonymat', 'id_inscription_pedagogique');

        $this->assertSame('1', $examCodes[$alphaFirst->id_inscription_pedagogique]);
        $this->assertSame('3', $examCodes[$gammaFirst->id_inscription_pedagogique]);
        $this->assertDatabaseHas('anonymat_semestres', [
            'id_inscription_admin' => $betaAdmin->id_inscription_admin,
            'id_semestre' => $semestre->id_semestre,
            'id_annee' => $annee->id_annee,
            'code_anonymat' => '2',
        ]);
        $this->assertNotNull($betaSecond);
    }

    public function test_update_synchronizes_other_exam_lists_for_the_same_semester(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'semestre' => $semestre,
            'module' => $firstModule,
            'salle' => $salle,
            'offre' => $firstOffre,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $secondModule = Module::factory()->create();
        $secondOffre = OffreFormation::create([
            'id_module' => $secondModule->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Deuxieme offre module commune',
        ]);

        $alphaAdmin = $this->createAdministrativeRegistration($section, $annee, $niveau, 'Alpha', 'A');
        $betaAdmin = $this->createAdministrativeRegistration($section, $annee, $niveau, 'Beta', 'B');

        $alphaFirst = $this->createPedagogicalRegistrationForAdministrative($alphaAdmin, $firstOffre);
        $alphaSecond = $this->createPedagogicalRegistrationForAdministrative($alphaAdmin, $secondOffre);
        $betaFirst = $this->createPedagogicalRegistrationForAdministrative($betaAdmin, $firstOffre);
        $betaSecond = $this->createPedagogicalRegistrationForAdministrative($betaAdmin, $secondOffre);

        $this->actingAs($user)->post(route('examens.examens.store'), [
            'id_session_examen' => $session->id_session_examen,
            'id_module' => $firstModule->id_module,
            'salles' => [$salle->id_salle],
            'anonymat_start' => 1,
            'date_examen' => '2026-06-20',
            'date_debut' => '2026-06-20 08:00:00',
            'date_fin' => '2026-06-20 10:00:00',
            'statut' => 'Planifiee',
            'description' => 'Premier examen semestre',
        ])->assertRedirect(route('examens.examens.index'));

        $this->actingAs($user)->post(route('examens.examens.store'), [
            'id_session_examen' => $session->id_session_examen,
            'id_module' => $secondModule->id_module,
            'salles' => [$salle->id_salle],
            'anonymat_start' => 1,
            'date_examen' => '2026-06-21',
            'date_debut' => '2026-06-21 08:00:00',
            'date_fin' => '2026-06-21 10:00:00',
            'statut' => 'Planifiee',
            'description' => 'Deuxieme examen semestre',
        ])->assertRedirect(route('examens.examens.index'));

        $firstExam = Examen::query()->where('id_module', $firstModule->id_module)->latest('id_examen')->first();
        $secondExam = Examen::query()->where('id_module', $secondModule->id_module)->latest('id_examen')->first();

        $this->assertNotNull($firstExam);
        $this->assertNotNull($secondExam);

        $this->actingAs($user)->put(route('examens.examens.update', $secondExam), [
            'id_session_examen' => $session->id_session_examen,
            'id_module' => $secondModule->id_module,
            'salles' => [$salle->id_salle],
            'anonymat_start' => 2,
            'date_examen' => '2026-06-21',
            'date_debut' => '2026-06-21 08:00:00',
            'date_fin' => '2026-06-21 10:00:00',
            'statut' => 'Planifiee',
            'description' => 'Deuxieme examen semestre mis a jour',
        ])->assertRedirect(route('examens.examens.index'));

        $firstExam = $firstExam->fresh();
        $secondExam = $secondExam->fresh();

        $firstExamCodes = Anonymat::query()
            ->where('id_examen', $firstExam->id_examen)
            ->pluck('code_anonymat', 'id_inscription_pedagogique');
        $secondExamCodes = Anonymat::query()
            ->where('id_examen', $secondExam->id_examen)
            ->pluck('code_anonymat', 'id_inscription_pedagogique');

        $this->assertSame(2, $firstExam->anonymat_start);
        $this->assertSame(1, $firstExam->anonymat_end);
        $this->assertSame(2, $secondExam->anonymat_start);
        $this->assertSame(1, $secondExam->anonymat_end);
        $this->assertSame('2', $firstExamCodes[$alphaFirst->id_inscription_pedagogique]);
        $this->assertSame('2', $secondExamCodes[$alphaSecond->id_inscription_pedagogique]);
        $this->assertSame('1', $firstExamCodes[$betaFirst->id_inscription_pedagogique]);
        $this->assertSame('1', $secondExamCodes[$betaSecond->id_inscription_pedagogique]);
    }

    public function test_store_ignores_submitted_element_and_creates_a_module_exam(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'offre' => $offre,
            'module' => $module,
            'salle' => $salle,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $element = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'ANA-TP',
            'nom_element' => 'Travaux pratiques',
        ]);

        $inscriptionPedagogique = $this->createPedagogicalRegistration(
            $section,
            $annee,
            $niveau,
            $offre,
            'Alpha',
            'Element'
        );

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'id_module' => $module->id_module,
                'id_element' => $element->id_element,
                'salles' => [$salle->id_salle],
                'date_examen' => '2026-06-20',
                'date_debut' => '2026-06-20 08:00:00',
                'date_fin' => '2026-06-20 10:00:00',
                'statut' => 'Planifiee',
                'description' => 'Examen element',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $examen = Examen::query()->latest('id_examen')->first();

        $this->assertNotNull($examen);
        $this->assertDatabaseHas('examens', [
            'id_examen' => $examen->id_examen,
            'id_module' => $module->id_module,
            'id_element' => null,
        ]);
        $this->assertDatabaseHas('repartition_etudiants', [
            'id_examen' => $examen->id_examen,
            'id_inscription_pedagogique' => $inscriptionPedagogique->id_inscription_pedagogique,
        ]);
    }

    public function test_store_bulk_planning_creates_only_module_exams(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'offre' => $offre,
            'module' => $module,
            'salle' => $salle,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $inscriptionPedagogique = $this->createPedagogicalRegistration(
            $section,
            $annee,
            $niveau,
            $offre,
            'Alpha',
            'Bulk'
        );

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'plan_all_filtered_modules' => true,
                'salles' => [$salle->id_salle],
                'module_plannings' => [
                    [
                        'id_module' => $module->id_module,
                        'date_examen' => '2026-06-20',
                        'date_debut' => '2026-06-20 08:00:00',
                        'date_fin' => '2026-06-20 10:00:00',
                    ],
                ],
                'statut' => 'Planifiee',
                'description' => 'Planification groupee par module',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $plannedExamens = Examen::query()
            ->where('id_session_examen', $session->id_session_examen)
            ->where('id_module', $module->id_module)
            ->orderBy('id_examen')
            ->get();

        $this->assertCount(1, $plannedExamens);

        $moduleExam = $plannedExamens->first();

        $this->assertNotNull($moduleExam);
        $this->assertNull($moduleExam->id_element);
        $this->assertDatabaseHas('repartition_etudiants', [
            'id_examen' => $moduleExam->id_examen,
            'id_inscription_pedagogique' => $inscriptionPedagogique->id_inscription_pedagogique,
        ]);
    }

    public function test_store_ignores_foreign_element_input_and_keeps_module_exam(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'offre' => $offre,
            'module' => $module,
            'salle' => $salle,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $otherModule = Module::factory()->create();
        $otherElement = ElementModule::factory()->create([
            'id_module' => $otherModule->id_module,
            'code_element' => 'OTH-TP',
        ]);

        $this->createPedagogicalRegistration(
            $section,
            $annee,
            $niveau,
            $offre,
            'Alpha',
            'A'
        );

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'id_module' => $module->id_module,
                'id_element' => $otherElement->id_element,
                'salles' => [$salle->id_salle],
                'date_examen' => '2026-06-20',
                'date_debut' => '2026-06-20 08:00:00',
                'date_fin' => '2026-06-20 10:00:00',
                'statut' => 'Planifiee',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $examen = Examen::query()->latest('id_examen')->first();

        $this->assertNotNull($examen);
        $this->assertSame($module->id_module, $examen->id_module);
        $this->assertNull($examen->id_element);
    }

    public function test_store_places_credit_registrations_in_the_last_selected_salle(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create(['id_filiere' => $filiere->id_filiere]);
        $niveau = Niveau::factory()->create();
        $semestre = Semestre::factory()->create(['id_niveau' => $niveau->id_niveau]);
        $module = Module::factory()->create();
        $premiereSalle = Salle::factory()->create([
            'code_salle' => 'A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);
        $derniereSalle = Salle::factory()->create([
            'code_salle' => 'B202',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        UserFiliereAnnee::create([
            'user_id' => $user->id,
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Offre module credit',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session credit commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-15',
            'quadrimestre' => 2,
        ]);

        $inscriptions = collect([
            ['nom' => 'Alpha', 'prenom' => 'Normal', 'type' => 'Normal'],
            ['nom' => 'Beta', 'prenom' => 'Normal', 'type' => 'Normal'],
            ['nom' => 'Gamma', 'prenom' => 'Credit', 'type' => 'Credit'],
        ])->map(function (array $payload) use ($section, $annee, $niveau, $offre) {
            $etudiant = Etudiant::factory()->create([
                'id_section' => $section->id_section,
                'nom' => $payload['nom'],
                'prenom' => $payload['prenom'],
            ]);

            $inscriptionAdministrative = InscriptionAdministrative::create([
                'id_etudiant' => $etudiant->id_etudiant,
                'id_annee' => $annee->id_annee,
                'id_niveau' => $niveau->id_niveau,
                'id_section' => null,
                'date_inscription' => '2026-01-15',
                'statut' => 'Active',
                'type_inscription' => 'nouveau',
            ]);

            return InscriptionPedagogique::create([
                'id_inscription_admin' => $inscriptionAdministrative->id_inscription_admin,
                'id_offre' => $offre->id_offre,
                'type_inscription' => $payload['type'],
                'credits_acquis' => 0,
            ]);
        });

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'id_module' => $module->id_module,
                'salles' => [$premiereSalle->id_salle, $derniereSalle->id_salle],
                'date_examen' => '2026-06-20',
                'date_debut' => '2026-06-20 08:00:00',
                'date_fin' => '2026-06-20 10:00:00',
                'statut' => 'Planifiee',
                'description' => 'Examen avec credits',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $examen = Examen::query()->latest('id_examen')->first();
        $this->assertNotNull($examen);
        $examen->load('salles');

        $repartitions = RepartitionEtudiant::query()
            ->where('id_examen', $examen->id_examen)
            ->get()
            ->keyBy('id_inscription_pedagogique');

        $this->assertCount(3, $repartitions);

        $creditInscription = $inscriptions->firstWhere('type_inscription', 'Credit');
        $normalInscriptions = $inscriptions->where('type_inscription', 'Normal')->values();

        foreach ($normalInscriptions as $inscription) {
            $code = str_pad((string) $repartitions[$inscription->id_inscription_pedagogique]->code_grille, 7, '0', STR_PAD_LEFT);
            $this->assertSame('1', $code[3]);
        }

        $creditRepartition = $repartitions[$creditInscription->id_inscription_pedagogique];
        $creditCode = str_pad((string) $creditRepartition->code_grille, 7, '0', STR_PAD_LEFT);

        $this->assertSame(
            [$premiereSalle->id_salle, $derniereSalle->id_salle],
            $examen->salles->pluck('id_salle')->all()
        );
        $this->assertDatabaseHas('exam_salle', [
            'id_examen' => $examen->id_examen,
            'id_salle' => $premiereSalle->id_salle,
            'ordre' => 1,
        ]);
        $this->assertDatabaseHas('exam_salle', [
            'id_examen' => $examen->id_examen,
            'id_salle' => $derniereSalle->id_salle,
            'ordre' => 2,
        ]);
        $this->assertSame('2', $creditCode[3]);
        $this->assertSame('1', (string) $creditRepartition->numero_place);
    }

    public function test_store_can_generate_a_stable_random_student_order_for_repartition(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'offre' => $offre,
            'module' => $module,
            'salle' => $salle,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $inscriptions = collect([
            ['nom' => 'Alpha', 'prenom' => 'A', 'type' => 'Normal'],
            ['nom' => 'Beta', 'prenom' => 'B', 'type' => 'Normal'],
            ['nom' => 'Gamma', 'prenom' => 'C', 'type' => 'Normal'],
            ['nom' => 'Delta', 'prenom' => 'D', 'type' => 'Credit'],
        ])->map(function (array $payload) use ($section, $annee, $niveau, $offre) {
            return $this->createPedagogicalRegistration(
                $section,
                $annee,
                $niveau,
                $offre,
                $payload['nom'],
                $payload['prenom'],
                $payload['type']
            );
        });

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'id_module' => $module->id_module,
                'salles' => [$salle->id_salle],
                'student_order' => 'random',
                'date_examen' => '2026-06-20',
                'date_debut' => '2026-06-20 08:00:00',
                'date_fin' => '2026-06-20 10:00:00',
                'statut' => 'Planifiee',
                'description' => 'Examen avec ordre aleatoire',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $examen = Examen::query()->latest('id_examen')->first();

        $this->assertNotNull($examen);
        $this->assertSame('random', $examen->student_order);

        $orderedRegistrationIds = RepartitionEtudiant::query()
            ->where('id_examen', $examen->id_examen)
            ->orderBy('id_repartition')
            ->pluck('id_inscription_pedagogique')
            ->all();

        $expectedNormalOrder = $inscriptions
            ->where('type_inscription', 'Normal')
            ->sortBy(fn (InscriptionPedagogique $inscription) => hash(
                'sha256',
                sprintf('%s|%d', (string) $examen->id_examen, $inscription->id_inscription_pedagogique)
            ))
            ->pluck('id_inscription_pedagogique')
            ->values()
            ->all();

        $expectedCreditOrder = $inscriptions
            ->where('type_inscription', 'Credit')
            ->sortBy(fn (InscriptionPedagogique $inscription) => hash(
                'sha256',
                sprintf('%s|%d', (string) $examen->id_examen, $inscription->id_inscription_pedagogique)
            ))
            ->pluck('id_inscription_pedagogique')
            ->values()
            ->all();

        $this->assertSame(
            array_merge($expectedNormalOrder, $expectedCreditOrder),
            $orderedRegistrationIds
        );
        $this->assertSame(
            $inscriptions->firstWhere('type_inscription', 'Credit')?->id_inscription_pedagogique,
            end($orderedRegistrationIds)
        );
    }

    public function test_store_assigns_anonymats_in_real_alphabetical_student_order(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'offre' => $offre,
            'module' => $module,
            'salle' => $salle,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $this->createPedagogicalRegistration($section, $annee, $niveau, $offre, 'Zeta', 'Z');
        $this->createPedagogicalRegistration($section, $annee, $niveau, $offre, 'Alpha', 'A');
        $this->createPedagogicalRegistration($section, $annee, $niveau, $offre, 'Beta', 'B');

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'id_module' => $module->id_module,
                'salles' => [$salle->id_salle],
                'anonymat_start' => 1,
                'date_examen' => '2026-06-20',
                'date_debut' => '2026-06-20 08:00:00',
                'date_fin' => '2026-06-20 10:00:00',
                'statut' => 'Planifiee',
                'description' => 'Ordre alphabetique reel',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $examen = Examen::query()->latest('id_examen')->first();
        $this->assertNotNull($examen);

        $orderedByAnonymat = RepartitionEtudiant::query()
            ->with('inscriptionPedagogique.inscriptionAdministrative.etudiant:id_etudiant,nom,prenom')
            ->where('id_examen', $examen->id_examen)
            ->get()
            ->sortBy(fn (RepartitionEtudiant $repartition) => (int) $repartition->code_anonymat)
            ->values();

        $this->assertSame(
            ['1', '2', '3'],
            $orderedByAnonymat->pluck('code_anonymat')->all()
        );

        $this->assertSame(
            ['Alpha', 'Beta', 'Zeta'],
            $orderedByAnonymat
                ->map(fn (RepartitionEtudiant $repartition) => $repartition->inscriptionPedagogique?->inscriptionAdministrative?->etudiant?->nom)
                ->all()
        );
    }

    public function test_store_uses_the_requested_anonymat_start_and_wraps_codes_for_all_students(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'offre' => $offre,
            'module' => $module,
            'salle' => $salle,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        foreach ([
            ['nom' => 'Alpha', 'prenom' => 'A'],
            ['nom' => 'Beta', 'prenom' => 'B'],
            ['nom' => 'Gamma', 'prenom' => 'C'],
            ['nom' => 'Delta', 'prenom' => 'D'],
        ] as $payload) {
            $this->createPedagogicalRegistration(
                $section,
                $annee,
                $niveau,
                $offre,
                $payload['nom'],
                $payload['prenom']
            );
        }

        $response = $this
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'id_module' => $module->id_module,
                'salles' => [$salle->id_salle],
                'anonymat_start' => 3,
                'date_examen' => '2026-06-20',
                'date_debut' => '2026-06-20 08:00:00',
                'date_fin' => '2026-06-20 10:00:00',
                'statut' => 'Planifiee',
                'description' => 'Examen avec depart d anonymat',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $examen = Examen::query()->latest('id_examen')->first();

        $this->assertNotNull($examen);
        $this->assertSame(3, $examen->anonymat_start);
        $this->assertSame(2, $examen->anonymat_end);
        $this->assertSame(4, RepartitionEtudiant::where('id_examen', $examen->id_examen)->count());

        $expectedCodes = [
            '3',
            '4',
            '1',
            '2',
        ];

        $this->assertSame(
            $expectedCodes,
            Anonymat::query()
                ->where('id_examen', $examen->id_examen)
                ->orderBy('id_anonymat')
                ->pluck('code_anonymat')
                ->all()
        );
    }

    public function test_store_rejects_an_anonymat_start_above_available_registrations(): void
    {
        [
            'user' => $user,
            'annee' => $annee,
            'section' => $section,
            'niveau' => $niveau,
            'offre' => $offre,
            'module' => $module,
            'salle' => $salle,
            'session' => $session,
        ] = $this->createSharedSessionPlanningContext();

        $this->createPedagogicalRegistration($section, $annee, $niveau, $offre, 'Alpha', 'A');
        $this->createPedagogicalRegistration($section, $annee, $niveau, $offre, 'Beta', 'B');

        $response = $this
            ->from(route('examens.examens.index'))
            ->actingAs($user)
            ->post(route('examens.examens.store'), [
                'id_session_examen' => $session->id_session_examen,
                'id_module' => $module->id_module,
                'salles' => [$salle->id_salle],
                'anonymat_start' => 5,
                'date_examen' => '2026-06-20',
                'date_debut' => '2026-06-20 08:00:00',
                'date_fin' => '2026-06-20 10:00:00',
                'statut' => 'Planifiee',
                'description' => 'Depart invalide',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasErrors(['anonymat_start']);

        $this->assertDatabaseCount('examens', 0);
    }

    private function createSharedSessionPlanningContext(): array
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create(['id_filiere' => $filiere->id_filiere]);
        $niveau = Niveau::factory()->create();
        $semestre = Semestre::factory()->create(['id_niveau' => $niveau->id_niveau]);
        $module = Module::factory()->create();
        $salle = Salle::factory()->create([
            'capacite' => 60,
            'capacite_examens' => 60,
        ]);

        UserFiliereAnnee::create([
            'user_id' => $user->id,
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Offre module commune',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Normale Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-10',
            'quadrimestre' => 2,
        ]);

        return compact('user', 'annee', 'filiere', 'section', 'niveau', 'semestre', 'module', 'salle', 'offre', 'session');
    }

    private function createPedagogicalRegistration(
        Section $section,
        AnneeUniversitaire $annee,
        Niveau $niveau,
        OffreFormation $offre,
        string $nom,
        string $prenom,
        string $typeInscription = 'Normal'
    ): InscriptionPedagogique {
        $inscriptionAdministrative = $this->createAdministrativeRegistration($section, $annee, $niveau, $nom, $prenom);

        return $this->createPedagogicalRegistrationForAdministrative(
            $inscriptionAdministrative,
            $offre,
            $typeInscription
        );
    }

    private function createAdministrativeRegistration(
        Section $section,
        AnneeUniversitaire $annee,
        Niveau $niveau,
        string $nom,
        string $prenom
    ): InscriptionAdministrative {
        $etudiant = Etudiant::factory()->create([
            'id_section' => $section->id_section,
            'nom' => $nom,
            'prenom' => $prenom,
        ]);

        return InscriptionAdministrative::create([
            'id_etudiant' => $etudiant->id_etudiant,
            'id_annee' => $annee->id_annee,
            'id_niveau' => $niveau->id_niveau,
            'id_section' => null,
            'date_inscription' => '2026-01-15',
            'statut' => 'Active',
            'type_inscription' => 'nouveau',
        ]);
    }

    private function createPedagogicalRegistrationForAdministrative(
        InscriptionAdministrative $inscriptionAdministrative,
        OffreFormation $offre,
        string $typeInscription = 'Normal'
    ): InscriptionPedagogique {
        return InscriptionPedagogique::create([
            'id_inscription_admin' => $inscriptionAdministrative->id_inscription_admin,
            'id_offre' => $offre->id_offre,
            'type_inscription' => $typeInscription,
            'credits_acquis' => 0,
        ]);
    }

    private function createModuleResult(
        InscriptionPedagogique $inscriptionPedagogique,
        Module $module,
        string $statut,
        ?string $dateValidation = '2026-06-30'
    ): ResultatModule {
        return ResultatModule::create([
            'id_inscription_pedagogique' => $inscriptionPedagogique->id_inscription_pedagogique,
            'id_module' => $module->id_module,
            'moyenne_module' => 8.50,
            'statut' => $statut,
            'date_validation' => $dateValidation,
            'est_anticipe' => false,
        ]);
    }
}
