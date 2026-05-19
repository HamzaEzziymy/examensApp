<?php

namespace Tests\Feature;

use App\Http\Controllers\RepartitionEtudiantController;
use App\Models\AnneeUniversitaire;
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
use App\Support\CodeGrille;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\LaravelPdf\PdfBuilder;
use Tests\TestCase;

class RepartitionEtudiantControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_collective_export_filters_modules_by_filiere_niveau_and_semester(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiereMedecine = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $filierePharmacie = Filiere::factory()->create(['nom_filiere' => 'Pharmacie']);
        $sectionMedecine = Section::factory()->create([
            'id_filiere' => $filiereMedecine->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $sectionPharmacie = Section::factory()->create([
            'id_filiere' => $filierePharmacie->id_filiere,
            'nom_section' => 'Section Pharmacie',
        ]);
        $niveauLicence1 = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $niveauLicence2 = Niveau::factory()->create(['nom_niveau' => 'Licence 2']);
        $semestre1 = Semestre::factory()->create([
            'id_niveau' => $niveauLicence1->id_niveau,
            'nom_semestre' => 'S1',
            'ordre' => 1,
        ]);
        $semestre2 = Semestre::factory()->create([
            'id_niveau' => $niveauLicence1->id_niveau,
            'nom_semestre' => 'S2',
            'ordre' => 2,
        ]);
        $semestre3 = Semestre::factory()->create([
            'id_niveau' => $niveauLicence2->id_niveau,
            'nom_semestre' => 'S3',
            'ordre' => 1,
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        UserFiliereAnnee::create([
            'user_id' => $user->id,
            'id_filiere' => $filiereMedecine->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        $selectedModule = Module::factory()->create([
            'code_module' => 'MED-S1-001',
            'nom_module' => 'Anatomie Generale',
        ]);
        $otherFiliereModule = Module::factory()->create([
            'code_module' => 'PHA-S1-001',
            'nom_module' => 'Chimie Pharmaceutique',
        ]);
        $otherSemesterModule = Module::factory()->create([
            'code_module' => 'MED-S2-001',
            'nom_module' => 'Histologie',
        ]);
        $otherLevelModule = Module::factory()->create([
            'code_module' => 'MED-S3-001',
            'nom_module' => 'Physiologie Avancee',
        ]);

        $selectedOffre = OffreFormation::create([
            'id_module' => $selectedModule->id_module,
            'id_semestre' => $semestre1->id_semestre,
            'id_section' => $sectionMedecine->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);
        $otherFiliereOffre = OffreFormation::create([
            'id_module' => $otherFiliereModule->id_module,
            'id_semestre' => $semestre1->id_semestre,
            'id_section' => $sectionPharmacie->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Chimie Pharmaceutique',
        ]);
        $otherSemesterOffre = OffreFormation::create([
            'id_module' => $otherSemesterModule->id_module,
            'id_semestre' => $semestre2->id_semestre,
            'id_section' => $sectionMedecine->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Histologie',
        ]);
        $otherLevelOffre = OffreFormation::create([
            'id_module' => $otherLevelModule->id_module,
            'id_semestre' => $semestre3->id_semestre,
            'id_section' => $sectionMedecine->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Physiologie Avancee',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $selectedExam = $this->createExam($session, $selectedModule, $salle, '2026-06-10');
        $otherFiliereExam = $this->createExam($session, $otherFiliereModule, $salle, '2026-06-11');
        $otherSemesterExam = $this->createExam($session, $otherSemesterModule, $salle, '2026-06-12');
        $otherLevelExam = $this->createExam($session, $otherLevelModule, $salle, '2026-06-13');

        $selectedRegistration = $this->createPedagogicalRegistration($annee, $niveauLicence1, $sectionMedecine, $selectedOffre, 'Alpha', 'Med');
        $otherFiliereRegistration = $this->createPedagogicalRegistration($annee, $niveauLicence1, $sectionPharmacie, $otherFiliereOffre, 'Beta', 'Pharma');
        $otherSemesterRegistration = $this->createPedagogicalRegistration($annee, $niveauLicence1, $sectionMedecine, $otherSemesterOffre, 'Gamma', 'Semestre');
        $otherLevelRegistration = $this->createPedagogicalRegistration($annee, $niveauLicence2, $sectionMedecine, $otherLevelOffre, 'Delta', 'Niveau');

        $this->createRepartition($selectedExam, $selectedRegistration, '00010001', 'A101-001');
        $this->createRepartition($otherFiliereExam, $otherFiliereRegistration, '00010002', 'A101-002');
        $this->createRepartition($otherSemesterExam, $otherSemesterRegistration, '00010003', 'A101-003');
        $this->createRepartition($otherLevelExam, $otherLevelRegistration, '00010004', 'A101-004');

        $this->actingAs($user);

        $controller = app(RepartitionEtudiantController::class);
        $request = Request::create(
            route('surveillance.repartition-etudiants.export-collective', $selectedExam),
            'GET'
        );

        $pdf = $controller->exportCollective($request, $selectedExam->fresh());

        $this->assertInstanceOf(PdfBuilder::class, $pdf);
        $this->assertSame('pdfs.repartition-collective', $pdf->viewName);
        $this->assertSame($selectedExam->id_examen, $pdf->viewData['examen']->id_examen);
        $this->assertSame(
            [$selectedModule->nom_module],
            collect($pdf->viewData['modules'])->pluck('name')->all()
        );
        $this->assertSame(
            ['S1'],
            collect($pdf->viewData['modules'])->pluck('semestre')->filter()->unique()->values()->all()
        );
        $this->assertSame(1, $pdf->viewData['studentsTotal']);
        $this->assertSame(1, collect($pdf->viewData['groups'])->sum('total'));

        $html = view($pdf->viewName, $pdf->viewData)->render();
        $this->assertStringContainsString('class="presence-table"', $html);
        $this->assertStringContainsString('width: 72%;', $html);
        $this->assertStringContainsString('width: 22%;', $html);
    }

    public function test_collective_export_per_salle_can_export_a_room_not_used_by_the_selected_exam(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
            'ordre' => 1,
        ]);
        $salleA = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);
        $salleB = Salle::factory()->create([
            'code_salle' => 'B202',
            'nom_salle' => 'Salle B202',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        UserFiliereAnnee::create([
            'user_id' => $user->id,
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        $selectedModule = Module::factory()->create([
            'code_module' => 'MED-S1-001',
            'nom_module' => 'Anatomie Generale',
        ]);
        $sharedSalleAModule = Module::factory()->create([
            'code_module' => 'MED-S1-002',
            'nom_module' => 'Histologie',
        ]);
        $sharedSalleBModule = Module::factory()->create([
            'code_module' => 'MED-S1-003',
            'nom_module' => 'Physiologie',
        ]);

        $selectedOffre = OffreFormation::create([
            'id_module' => $selectedModule->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);
        $sharedSalleAOffre = OffreFormation::create([
            'id_module' => $sharedSalleAModule->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Histologie',
        ]);
        $sharedSalleBOffre = OffreFormation::create([
            'id_module' => $sharedSalleBModule->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Physiologie',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $selectedExam = $this->createExam($session, $selectedModule, $salleA, '2026-06-10');
        $sharedSalleAExam = $this->createExam($session, $sharedSalleAModule, $salleA, '2026-06-11');
        $sharedSalleBExam = $this->createExam($session, $sharedSalleBModule, $salleB, '2026-06-12');

        $alphaRegistration = $this->createPedagogicalRegistration(
            $annee,
            $niveau,
            $section,
            $selectedOffre,
            'Alpha',
            'A'
        );
        $betaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $selectedOffre, 'Beta', 'B');

        $alphaSalleARegistration = InscriptionPedagogique::create([
            'id_inscription_admin' => $alphaRegistration->id_inscription_admin,
            'id_offre' => $sharedSalleAOffre->id_offre,
            'type_inscription' => 'Normal',
            'credits_acquis' => 0,
        ]);
        $betaSalleBRegistration = InscriptionPedagogique::create([
            'id_inscription_admin' => $betaRegistration->id_inscription_admin,
            'id_offre' => $sharedSalleBOffre->id_offre,
            'type_inscription' => 'Normal',
            'credits_acquis' => 0,
        ]);

        $this->createRepartition($selectedExam, $alphaRegistration, '00010001', '1');
        $this->createRepartition($selectedExam, $betaRegistration, '00010002', '2');
        $this->createRepartition($sharedSalleAExam, $alphaSalleARegistration, '00010001', '1');
        $this->createRepartition($sharedSalleBExam, $betaSalleBRegistration, '00010001', '1');

        $this->actingAs($user);

        $controller = app(RepartitionEtudiantController::class);

        $salleARequest = Request::create(
            route('surveillance.repartition-etudiants.export-collective', $selectedExam),
            'GET',
            ['salle_id' => $salleA->id_salle]
        );
        $salleAPdf = $controller->exportCollective($salleARequest, $selectedExam->fresh());

        $this->assertInstanceOf(PdfBuilder::class, $salleAPdf);
        $this->assertSame(
            [$selectedModule->nom_module, $sharedSalleAModule->nom_module],
            collect($salleAPdf->viewData['modules'])->pluck('name')->all()
        );
        $this->assertSame(1, collect($salleAPdf->viewData['groups'])->count());
        $this->assertSame('Salle A101', $salleAPdf->viewData['groups']->first()['salle']->nom_salle);

        $salleBRequest = Request::create(
            route('surveillance.repartition-etudiants.export-collective', $selectedExam),
            'GET',
            ['salle_id' => $salleB->id_salle]
        );
        $salleBPdf = $controller->exportCollective($salleBRequest, $selectedExam->fresh());

        $this->assertInstanceOf(PdfBuilder::class, $salleBPdf);
        $this->assertSame(
            [$sharedSalleBModule->nom_module],
            collect($salleBPdf->viewData['modules'])->pluck('name')->all()
        );
        $this->assertSame(1, collect($salleBPdf->viewData['groups'])->count());
        $this->assertSame('Salle B202', $salleBPdf->viewData['groups']->first()['salle']->nom_salle);
    }

<<<<<<< HEAD
=======
    public function test_collective_excel_export_streams_a_workbook_with_module_columns(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
            'ordre' => 1,
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        UserFiliereAnnee::create([
            'user_id' => $user->id,
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        $moduleA = Module::factory()->create([
            'code_module' => 'MED-S1-001',
            'nom_module' => 'Anatomie Generale',
        ]);
        $moduleB = Module::factory()->create([
            'code_module' => 'MED-S1-002',
            'nom_module' => 'Histologie',
        ]);

        $offreA = OffreFormation::create([
            'id_module' => $moduleA->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);
        $offreB = OffreFormation::create([
            'id_module' => $moduleB->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Histologie',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $examA = $this->createExam($session, $moduleA, $salle, '2026-06-10');
        $examB = $this->createExam($session, $moduleB, $salle, '2026-06-11');

        $registrationA = $this->createPedagogicalRegistration($annee, $niveau, $section, $offreA, 'Alpha', 'One');
        $registrationB = $this->createPedagogicalRegistration($annee, $niveau, $section, $offreB, 'Beta', 'Two');

        $this->createRepartition($examA, $registrationA, '00010001', 'A101-001');
        $this->createRepartition($examB, $registrationB, '00010002', 'A101-002');

        $response = $this
            ->actingAs($user)
            ->get(route('surveillance.repartition-etudiants.export-collective-excel', $examA));

        $response->assertOk();
        $this->assertStringContainsString(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            (string) $response->headers->get('content-type')
        );
        $this->assertStringContainsString(
            '.xlsx',
            (string) $response->headers->get('content-disposition')
        );

        $content = $response->streamedContent();
        $this->assertGreaterThan(1000, strlen($content));
        $this->assertSame('PK', substr($content, 0, 2));
    }

>>>>>>> 3062ae46740a3e7162e3aa04d093c1fe3e2ade5b
    public function test_collective_export_per_salle_keeps_students_split_across_multi_room_exam(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
            'ordre' => 1,
        ]);
        $salleA = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);
        $salleB = Salle::factory()->create([
            'code_salle' => 'B202',
            'nom_salle' => 'Salle B202',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        UserFiliereAnnee::create([
            'user_id' => $user->id,
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        $module = Module::factory()->create([
            'code_module' => 'MED-S1-001',
            'nom_module' => 'Anatomie Generale',
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salleA, '2026-06-10');
        $exam->salles()->sync([$salleA->id_salle, $salleB->id_salle]);

        $alphaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Alpha');
        $betaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Beta', 'Beta');

        $this->createRepartition($exam, $alphaRegistration, '00010001', 'A101-001');
        $this->createRepartition($exam, $betaRegistration, '00020001', 'B202-001');

        $this->actingAs($user);

        $controller = app(RepartitionEtudiantController::class);

        $salleARequest = Request::create(
            route('surveillance.repartition-etudiants.export-collective', $exam),
            'GET',
            ['salle_id' => $salleA->id_salle]
        );
        $salleAPdf = $controller->exportCollective($salleARequest, $exam->fresh());

        $this->assertInstanceOf(PdfBuilder::class, $salleAPdf);
        $this->assertSame(1, $salleAPdf->viewData['studentsTotal']);
        $this->assertSame(['Alpha'], collect($salleAPdf->viewData['groups']->first()['rows'])->pluck('nom')->all());
        $this->assertSame('Salle A101', $salleAPdf->viewData['groups']->first()['salle']->nom_salle);

        $salleBRequest = Request::create(
            route('surveillance.repartition-etudiants.export-collective', $exam),
            'GET',
            ['salle_id' => $salleB->id_salle]
        );
        $salleBPdf = $controller->exportCollective($salleBRequest, $exam->fresh());

        $this->assertInstanceOf(PdfBuilder::class, $salleBPdf);
        $this->assertSame(1, $salleBPdf->viewData['studentsTotal']);
        $this->assertSame(['Beta'], collect($salleBPdf->viewData['groups']->first()['rows'])->pluck('nom')->all());
        $this->assertSame('Salle B202', $salleBPdf->viewData['groups']->first()['salle']->nom_salle);
    }

    public function test_salles_places_export_keeps_the_repartition_seat_order(): void
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'MED-S1-001',
            'nom_module' => 'Anatomie Generale',
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salle, '2026-06-10');

        $zuluRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Zulu', 'Charlie');
        $alphaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Bravo');
        $betaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Beta', 'Alpha');

        $this->createRepartition($exam, $alphaRegistration, '00010001', 'A101-001');
        $this->createRepartition($exam, $betaRegistration, '00010002', 'A101-002');
        $this->createRepartition($exam, $zuluRegistration, '00010003', 'A101-003');

        $controller = app(RepartitionEtudiantController::class);
        $request = Request::create(
            route('surveillance.repartition-etudiants.export-salles-places', $exam),
            'GET'
        );

        $pdf = $controller->exportSallesPlaces($request, $exam->fresh());

        $this->assertInstanceOf(PdfBuilder::class, $pdf);
        $this->assertSame('pdfs.repartition-salles-places', $pdf->viewName);
        $this->assertSame('Session Commune (Normale)', $pdf->viewData['sessionLabel']);
        $this->assertSame($module->nom_module, $pdf->viewData['displayLabel']);
        $this->assertSame(
            ['Alpha', 'Beta', 'Zulu'],
            collect($pdf->viewData['rows'])->pluck('nom')->all()
        );
        $this->assertCount(1, $pdf->viewData['groups']);
<<<<<<< HEAD
=======

        $html = view($pdf->viewName, $pdf->viewData)->render();
        $this->assertStringContainsString('<h1>Plan de salle</h1>', $html);
        $this->assertStringContainsString('<th>N place</th>', $html);
        $this->assertStringContainsString('<th>Nom et Prenom</th>', $html);
        $this->assertStringNotContainsString('<th>CNE</th>', $html);
        $this->assertStringNotContainsString('<th>Place</th>', $html);
>>>>>>> 3062ae46740a3e7162e3aa04d093c1fe3e2ade5b
    }

    public function test_salles_places_export_keeps_students_in_their_code_grille_salle(): void
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'MED-S1-001',
            'nom_module' => 'Anatomie Generale',
        ]);
        $salleA = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);
        $salleB = Salle::factory()->create([
            'code_salle' => 'B202',
            'nom_salle' => 'Salle B202',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salleA, '2026-06-10');
        $exam->salles()->sync([$salleA->id_salle, $salleB->id_salle]);

        $zuluRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Zulu', 'Bravo');
        $alphaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Alpha');

<<<<<<< HEAD
        $this->createRepartition($exam, $zuluRegistration, '0001001', 'A101-001');
        $this->createRepartition($exam, $alphaRegistration, '0002001', 'B202-001');
=======
        $this->createRepartition($exam, $zuluRegistration, '00010001', 'A101-001');
        $this->createRepartition($exam, $alphaRegistration, '00020001', 'B202-001');
        $this->createRepartition($otherExam, $zuluOtherRegistration, '00010001', 'A101-001');
        $this->createRepartition($otherExam, $alphaOtherRegistration, '00020001', 'B202-001');
>>>>>>> 3062ae46740a3e7162e3aa04d093c1fe3e2ade5b

        $controller = app(RepartitionEtudiantController::class);
        $request = Request::create(
            route('surveillance.repartition-etudiants.export-salles-places', $exam),
            'GET'
        );

        $pdf = $controller->exportSallesPlaces($request, $exam->fresh());

        $this->assertInstanceOf(PdfBuilder::class, $pdf);
        $this->assertCount(2, $pdf->viewData['groups']);
        $this->assertSame(
            ['Salle A101', 'Salle B202'],
            collect($pdf->viewData['groups'])->map(fn ($group) => $group['salle']?->nom_salle)->all()
        );
        $this->assertSame(
            [['Zulu'], ['Alpha']],
            collect($pdf->viewData['groups'])
                ->map(fn ($group) => collect($group['rows'])->pluck('nom')->all())
                ->all()
        );
    }

<<<<<<< HEAD
=======
    public function test_salles_places_export_includes_capitalisation_students_with_full_place_numbers(): void
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'MED-S1-001',
            'nom_module' => 'Anatomie Generale',
        ]);
        $otherModule = Module::factory()->create([
            'code_module' => 'MED-S1-002',
            'nom_module' => 'Histologie',
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);
        $otherOffre = OffreFormation::create([
            'id_module' => $otherModule->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Histologie',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salle, '2026-06-10');
        $otherExam = $this->createExam($session, $otherModule, $salle, '2026-06-11');

        $normalRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Normal');
        $capitalisationRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Beta', 'Capitalisation');
        $capitalisationRegistration->update(['type_inscription' => 'Capitalisation']);
        $capitalisationOtherRegistration = InscriptionPedagogique::create([
            'id_inscription_admin' => $capitalisationRegistration->id_inscription_admin,
            'id_offre' => $otherOffre->id_offre,
            'type_inscription' => 'Capitalisation',
            'credits_acquis' => 0,
        ]);

        $this->createRepartition($exam, $normalRegistration, '00010001', 'A101-001');
        $this->createRepartition($otherExam, $capitalisationOtherRegistration, '00010002', 'A101-002');

        $controller = app(RepartitionEtudiantController::class);
        $request = Request::create(
            route('surveillance.repartition-etudiants.export-salles-places', $exam),
            'GET'
        );

        $pdf = $controller->exportSallesPlaces($request, $exam->fresh());

        $this->assertInstanceOf(PdfBuilder::class, $pdf);
        $this->assertSame(
            ['Alpha', 'Beta'],
            collect($pdf->viewData['rows'])->pluck('nom')->all()
        );

        $html = view($pdf->viewName, $pdf->viewData)->render();
        $this->assertStringContainsString('<th>N place</th>', $html);
        $this->assertStringContainsString('<th>Nom et Prenom</th>', $html);
        $this->assertStringContainsString('Alpha Normal', $html);
        $this->assertStringContainsString('Beta Capitalisation', $html);
        $this->assertStringNotContainsString('<th>Place</th>', $html);
    }

    public function test_salles_places_export_keeps_the_same_semester_place_for_a_student_across_modules(): void
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'MED-S1-001',
            'nom_module' => 'Anatomie Generale',
        ]);
        $otherModule = Module::factory()->create([
            'code_module' => 'MED-S1-002',
            'nom_module' => 'Histologie',
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);
        $otherOffre = OffreFormation::create([
            'id_module' => $otherModule->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Histologie',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salle, '2026-06-10');
        $otherExam = $this->createExam($session, $otherModule, $salle, '2026-06-11');

        $alphaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Stable');
        $gammaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $otherOffre, 'Gamma', 'Autre');
        $alphaCapitalisationRegistration = InscriptionPedagogique::create([
            'id_inscription_admin' => $alphaRegistration->id_inscription_admin,
            'id_offre' => $otherOffre->id_offre,
            'type_inscription' => 'Capitalisation',
            'credits_acquis' => 0,
        ]);

        $this->createRepartition($exam, $alphaRegistration, '00010001', 'A101-001');
        $this->createRepartition($otherExam, $alphaCapitalisationRegistration, '00010009', 'A101-009');
        $this->createRepartition($otherExam, $gammaRegistration, '00010002', 'A101-002');

        $controller = app(RepartitionEtudiantController::class);
        $firstPdf = $controller->exportSallesPlaces(
            Request::create(route('surveillance.repartition-etudiants.export-salles-places', $exam), 'GET'),
            $exam->fresh()
        );
        $secondPdf = $controller->exportSallesPlaces(
            Request::create(route('surveillance.repartition-etudiants.export-salles-places', $otherExam), 'GET'),
            $otherExam->fresh()
        );

        $firstSeats = collect($firstPdf->viewData['rows'])
            ->mapWithKeys(fn ($row) => [$row['nom'] => $row['numero_place']])
            ->all();
        $secondSeats = collect($secondPdf->viewData['rows'])
            ->mapWithKeys(fn ($row) => [$row['nom'] => $row['numero_place']])
            ->all();
        $firstGrilles = collect($firstPdf->viewData['rows'])
            ->mapWithKeys(fn ($row) => [$row['nom'] => CodeGrille::normalize($row['code_grille'])])
            ->all();
        $secondGrilles = collect($secondPdf->viewData['rows'])
            ->mapWithKeys(fn ($row) => [$row['nom'] => CodeGrille::normalize($row['code_grille'])])
            ->all();

        $this->assertSame(
            [
                'Alpha' => 'A101-001',
                'Gamma' => 'A101-002',
            ],
            $firstSeats
        );
        $this->assertSame($firstSeats, $secondSeats);
        $this->assertSame(
            [
                'Alpha' => '00010001',
                'Gamma' => '00010002',
            ],
            $firstGrilles
        );
        $this->assertSame($firstGrilles, $secondGrilles);
        $this->assertCount(2, array_unique(array_values($secondSeats)));
    }

    public function test_salles_places_export_uses_code_grille_suffix_to_avoid_duplicate_semester_places(): void
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $moduleA = Module::factory()->create([
            'code_module' => 'MED-S1-001',
            'nom_module' => 'Anatomie Generale',
        ]);
        $moduleB = Module::factory()->create([
            'code_module' => 'MED-S1-002',
            'nom_module' => 'Histologie',
        ]);
        $moduleC = Module::factory()->create([
            'code_module' => 'MED-S1-003',
            'nom_module' => 'Biophysique',
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        $offreA = OffreFormation::create([
            'id_module' => $moduleA->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);
        $offreB = OffreFormation::create([
            'id_module' => $moduleB->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Histologie',
        ]);
        $offreC = OffreFormation::create([
            'id_module' => $moduleC->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Biophysique',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $examA = $this->createExam($session, $moduleA, $salle, '2026-06-10');
        $examB = $this->createExam($session, $moduleB, $salle, '2026-06-11');
        $examC = $this->createExam($session, $moduleC, $salle, '2026-06-12');

        $alphaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offreA, 'Alpha', 'Stable');
        $betaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offreB, 'Beta', 'Mixed');
        $betaAlternativeRegistration = InscriptionPedagogique::create([
            'id_inscription_admin' => $betaRegistration->id_inscription_admin,
            'id_offre' => $offreC->id_offre,
            'type_inscription' => 'Capitalisation',
            'credits_acquis' => 0,
        ]);

        $this->createRepartition($examA, $alphaRegistration, '00010001', '1');
        $this->createRepartition($examB, $betaRegistration, '00010001', 'A101-001');
        $this->createRepartition($examC, $betaAlternativeRegistration, '00010002', 'A101-002');

        $controller = app(RepartitionEtudiantController::class);
        $pdf = $controller->exportSallesPlaces(
            Request::create(route('surveillance.repartition-etudiants.export-salles-places', $examA), 'GET'),
            $examA->fresh()
        );

        $seats = collect($pdf->viewData['rows'])
            ->mapWithKeys(fn ($row) => [$row['nom'] => $row['numero_place']])
            ->all();
        $grilles = collect($pdf->viewData['rows'])
            ->mapWithKeys(fn ($row) => [$row['nom'] => CodeGrille::normalize($row['code_grille'])])
            ->all();

        $this->assertSame(
            [
                'Alpha' => '1',
                'Beta' => 'A101-002',
            ],
            $seats
        );
        $this->assertSame(
            [
                'Alpha' => '00010001',
                'Beta' => '00010002',
            ],
            $grilles
        );
        $this->assertCount(2, array_unique(array_values($grilles)));
    }

>>>>>>> 3062ae46740a3e7162e3aa04d093c1fe3e2ade5b
    public function test_collective_export_uses_element_name_when_dentaire_exam_targets_a_module_element(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine Dentaire']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Dentaire',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'DEN-S1-001',
            'nom_module' => 'Anatomie Dentaire',
        ]);
        $element = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'DEN-S1-001-TP',
            'nom_element' => 'Travaux pratiques',
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
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
            'nom_affiche' => 'Anatomie Dentaire',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salle, '2026-06-10', $element->id_element);
        $registration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Element');
        $this->createRepartition($exam, $registration, '00010001', 'A101-001');

        $this->actingAs($user);

        $controller = app(RepartitionEtudiantController::class);
        $request = Request::create(
            route('surveillance.repartition-etudiants.export-collective', $exam),
            'GET'
        );

        $pdf = $controller->exportCollective($request, $exam->fresh());

        $this->assertInstanceOf(PdfBuilder::class, $pdf);
        $this->assertSame(
            [$element->nom_element],
            collect($pdf->viewData['modules'])->pluck('name')->all()
        );
    }

    public function test_pdf_exports_keep_module_labels_for_non_dentaire_element_exams(): void
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'MED-S1-001',
            'nom_module' => 'Anatomie Generale',
        ]);
        $element = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'MED-S1-001-TP',
            'nom_element' => 'Travaux pratiques',
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salle, '2026-06-10', $element->id_element);
        $registration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Element');
        $this->createRepartition($exam, $registration, '00010001', 'A101-001');

        $controller = app(RepartitionEtudiantController::class);
        $request = Request::create(
            route('surveillance.repartition-etudiants.export', $exam),
            'GET'
        );

        $pdf = $controller->export($request, $exam->fresh());

        $this->assertInstanceOf(PdfBuilder::class, $pdf);
        $this->assertSame($module->nom_module, $pdf->viewData['displayLabel']);
        $this->assertNull($pdf->viewData['elementLabel']);
        $this->assertSame(
            sprintf('%s - %s', $module->code_module, $module->nom_module),
            $pdf->viewData['examLabel']
        );

        $html = view($pdf->viewName, $pdf->viewData)->render();
        $this->assertStringNotContainsString('N de place', $html);
        $this->assertStringNotContainsString('nb place', $html);
        $this->assertStringContainsString('<th>Place</th>', $html);
    }

    public function test_pdf_export_can_filter_requested_repartitions_and_keep_column_order(): void
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'MED-S1-001',
            'nom_module' => 'Anatomie Generale',
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salle, '2026-06-10');
        $firstRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Premier');
        $secondRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Beta', 'Second');

        $this->createRepartition($exam, $firstRegistration, '00010001', 'A101-001');
        $secondRepartition = $this->createRepartition($exam, $secondRegistration, '00010002', 'A101-002');

        $controller = app(RepartitionEtudiantController::class);
        $request = Request::create(
            route('surveillance.repartition-etudiants.export', $exam),
            'GET',
            [
                'columns' => ['place', 'cne'],
                'ids' => [$secondRepartition->id_repartition],
                'filename' => 'repartition-personnalisee',
            ]
        );

        $pdf = $controller->export($request, $exam->fresh());

        $this->assertInstanceOf(PdfBuilder::class, $pdf);
        $this->assertSame(['place', 'cne'], $pdf->viewData['columns']);
        $this->assertCount(1, $pdf->viewData['repartitions']);
        $this->assertSame($secondRepartition->id_repartition, $pdf->viewData['repartitions']->first()->id_repartition);
        $this->assertSame('repartition-personnalisee.pdf', $pdf->downloadName);

        $html = view($pdf->viewName, $pdf->viewData)->render();
        $this->assertStringContainsString('<th>Place</th>', $html);
        $this->assertStringContainsString('<th>CNE</th>', $html);
        $this->assertStringNotContainsString('<th>Etudiant</th>', $html);
        $this->assertTrue(strpos($html, '<th>Place</th>') < strpos($html, '<th>CNE</th>'));
        $this->assertStringContainsString('A101-002', $html);
        $this->assertStringNotContainsString('A101-001', $html);
    }

    public function test_pdf_export_renders_code_grille_with_eight_digits(): void
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'MED-S1-GRID',
            'nom_module' => 'Anatomie Generale',
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salle, '2026-06-10');
        $registration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Premier');
        $repartition = $this->createRepartition($exam, $registration, '1002', '2');

        $controller = app(RepartitionEtudiantController::class);
        $request = Request::create(
            route('surveillance.repartition-etudiants.export', $exam),
            'GET',
            [
                'columns' => ['grille', 'nom'],
                'ids' => [$repartition->id_repartition],
            ]
        );

        $pdf = $controller->export($request, $exam->fresh());

        $html = view($pdf->viewName, $pdf->viewData)->render();

        $this->assertStringContainsString('00001002', $html);
    }

    public function test_pdf_export_per_salle_uses_saved_repartition_room_counts_not_collective_order(): void
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'MED-S1-ROOMS',
            'nom_module' => 'Anatomie Generale',
        ]);
        $salleA = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);
        $salleB = Salle::factory()->create([
            'code_salle' => 'B202',
            'nom_salle' => 'Salle B202',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salleA, '2026-06-10');
        $exam->salles()->sync([
            $salleA->id_salle => ['ordre' => 1],
            $salleB->id_salle => ['ordre' => 2],
        ]);

        $zuluRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Zulu', 'First room');
        $alphaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Second room');

        $this->createRepartition($exam, $zuluRegistration, '00010001', 'A101-001');
        $this->createRepartition($exam, $alphaRegistration, '00020001', 'B202-001');

        $controller = app(RepartitionEtudiantController::class);

        $salleAPdf = $controller->export(
            Request::create(
                route('surveillance.repartition-etudiants.export', $exam),
                'GET',
                ['salle_index' => 1]
            ),
            $exam->fresh()
        );

        $this->assertInstanceOf(PdfBuilder::class, $salleAPdf);
        $this->assertSame(1, $salleAPdf->viewData['total']);
        $this->assertSame('Salle A101', $salleAPdf->viewData['salleGroups']->first()['salle']->nom_salle);
        $this->assertSame(['Zulu'], $salleAPdf->viewData['repartitions']->pluck('inscriptionPedagogique.inscriptionAdministrative.etudiant.nom')->all());

        $salleBPdf = $controller->export(
            Request::create(
                route('surveillance.repartition-etudiants.export', $exam),
                'GET',
                ['salle_index' => 2]
            ),
            $exam->fresh()
        );

        $this->assertInstanceOf(PdfBuilder::class, $salleBPdf);
        $this->assertSame(1, $salleBPdf->viewData['total']);
        $this->assertSame('Salle B202', $salleBPdf->viewData['salleGroups']->first()['salle']->nom_salle);
        $this->assertSame(['Alpha'], $salleBPdf->viewData['repartitions']->pluck('inscriptionPedagogique.inscriptionAdministrative.etudiant.nom')->all());
    }

    public function test_repartition_index_exposes_related_elements_for_biologie_cellulaire_moleculaire_et_genetique(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'BCMG-101',
            'nom_module' => 'Biologie Cellulaire Moléculaire et Génétique',
        ]);
        $extraElement = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'BCMG-TP',
            'nom_element' => 'Travaux pratiques de BCMG',
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        UserFiliereAnnee::create([
            'user_id' => $user->id,
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Biologie Cellulaire Moléculaire et Génétique',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salle, '2026-06-10');

        $response = $this
            ->actingAs($user)
            ->get(route('surveillance.repartition-etudiants.index', ['examen' => $exam->id_examen]));

        $response->assertInertia(fn (Assert $page) => $page
            ->component('examens/Repartition/Index')
            ->where('selectedExamenId', $exam->id_examen)
            ->where('examens.0.module.nom_module', 'Biologie Cellulaire Moléculaire et Génétique')
            ->has('examens.0.module.elements', 2)
            ->where('examens.0.module.elements.1.id_element', $extraElement->id_element)
            ->where('examens.0.module.elements.1.nom_element', 'Travaux pratiques de BCMG'));
    }

<<<<<<< HEAD
=======
    public function test_index_returns_exam_salles_in_the_saved_planning_order(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'MED-ORD-001',
            'nom_module' => 'Anatomie Generale',
        ]);
        $secondSelectedSalle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
            'capacite' => 30,
            'capacite_examens' => 30,
        ]);
        $firstSelectedSalle = Salle::factory()->create([
            'code_salle' => 'B202',
            'nom_salle' => 'Salle B202',
            'capacite' => 45,
            'capacite_examens' => 45,
        ]);

        UserFiliereAnnee::create([
            'user_id' => $user->id,
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $firstSelectedSalle, '2026-06-10');
        $exam->salles()->sync([
            $firstSelectedSalle->id_salle => ['ordre' => 1],
            $secondSelectedSalle->id_salle => ['ordre' => 2],
        ]);

        $response = $this
            ->actingAs($user)
            ->get(route('surveillance.repartition-etudiants.index', ['examen' => $exam->id_examen]));

        $response->assertInertia(fn (Assert $page) => $page
            ->component('examens/Repartition/Index')
            ->where('selectedExamenId', $exam->id_examen)
            ->where('salles.0.id_salle', $firstSelectedSalle->id_salle)
            ->where('salles.1.id_salle', $secondSelectedSalle->id_salle)
            ->where('examens.0.salles.0.id_salle', $firstSelectedSalle->id_salle)
            ->where('examens.0.salles.1.id_salle', $secondSelectedSalle->id_salle));
    }

    public function test_index_repairs_legacy_salle_order_when_current_mapping_overflows_capacity(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'MED-LEG-001',
            'nom_module' => 'Physiologie',
        ]);
        $smallSalle = Salle::factory()->create([
            'code_salle' => 'DEN',
            'nom_salle' => 'Salle dentaire',
            'capacite' => 1,
            'capacite_examens' => 1,
        ]);
        $largeSalle = Salle::factory()->create([
            'code_salle' => 'SSOL',
            'nom_salle' => 'Salle s.sol',
            'capacite' => 10,
            'capacite_examens' => 10,
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
            'nom_affiche' => 'Physiologie',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $smallSalle, '2026-06-10');
        $exam->salles()->sync([
            $smallSalle->id_salle => ['ordre' => 1],
            $largeSalle->id_salle => ['ordre' => 2],
        ]);

        $alpha = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'One');
        $beta = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Beta', 'Two');
        $gamma = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Gamma', 'Three');

        $this->createRepartition($exam, $alpha, '00010001', '1');
        $this->createRepartition($exam, $beta, '00010002', '2');
        $this->createRepartition($exam, $gamma, '00020001', '1');

        $response = $this
            ->actingAs($user)
            ->get(route('surveillance.repartition-etudiants.index', ['examen' => $exam->id_examen]));

        $response->assertInertia(fn (Assert $page) => $page
            ->component('examens/Repartition/Index')
            ->where('selectedExamenId', $exam->id_examen)
            ->where('salles.0.id_salle', $largeSalle->id_salle)
            ->where('salles.1.id_salle', $smallSalle->id_salle)
            ->where('examens.0.salles.0.id_salle', $largeSalle->id_salle)
            ->where('examens.0.salles.1.id_salle', $smallSalle->id_salle));
    }

>>>>>>> 3062ae46740a3e7162e3aa04d093c1fe3e2ade5b
    public function test_index_lists_only_students_with_matching_rattrapage_result_status_aliases(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'MED-RATT-01',
            'nom_module' => 'Anatomie de Rattrapage',
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
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
            'nom_affiche' => 'Anatomie de Rattrapage',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session de Rattrapage',
            'type_session' => 'Rattrapage',
            'date_session_examen' => '2026-07-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salle, '2026-07-10');

        $eligibleRattrapage = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Rattrapage');
        $eligibleLatestRattrapage = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Beta', 'LatestRattrapage');
        $ineligibleLatestValide = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Gamma', 'LatestValide');
        $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Delta', 'SansResultat');

        $this->createModuleResult($eligibleRattrapage, $module, 'Rattrapage', '2026-06-30');
        $this->createModuleResult($eligibleLatestRattrapage, $module, 'Valide', '2026-06-10');
        $this->createModuleResult($eligibleLatestRattrapage, $module, 'Rattrapage', '2026-06-30');
        $this->createModuleResult($ineligibleLatestValide, $module, 'Rattrapage', '2026-06-10');
        $this->createModuleResult($ineligibleLatestValide, $module, 'Valide', '2026-06-30');

        $response = $this
            ->actingAs($user)
            ->get(route('surveillance.repartition-etudiants.index', ['examen' => $exam->id_examen]));

        $response->assertInertia(fn (Assert $page) => $page
            ->component('examens/Repartition/Index')
            ->where('selectedExamenId', $exam->id_examen)
            ->has('inscriptions', 2)
            ->where('inscriptions.0.id_inscription_pedagogique', $eligibleRattrapage->id_inscription_pedagogique)
            ->where('inscriptions.1.id_inscription_pedagogique', $eligibleLatestRattrapage->id_inscription_pedagogique));
    }

    public function test_update_allows_current_unique_values_on_same_repartition(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section Medecine',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
        ]);
        $module = Module::factory()->create([
            'code_module' => 'MED-UPD-001',
            'nom_module' => 'Anatomie',
        ]);
        $salle = Salle::factory()->create([
            'code_salle' => 'A101',
            'nom_salle' => 'Salle A101',
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
            'nom_affiche' => 'Anatomie',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Normale',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);

        $exam = $this->createExam($session, $module, $salle, '2026-06-10');
        $inscriptionPedagogique = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Update');
        $repartition = $this->createRepartition($exam, $inscriptionPedagogique, '1001', 'A101-001');

        $response = $this
            ->actingAs($user)
            ->put(route('surveillance.repartition-etudiants.update', $repartition), [
                'id_examen' => $exam->id_examen,
                'id_inscription_pedagogique' => $inscriptionPedagogique->id_inscription_pedagogique,
                'code_grille' => 1001,
                'code_anonymat' => '1001',
                'numero_place' => 'A101-001',
                'present' => true,
                'observation' => 'MAJ',
            ]);

        $response->assertRedirect(route('surveillance.repartition-etudiants.index', ['examen' => $exam->id_examen]));

        $this->assertDatabaseHas('repartition_etudiants', [
            'id_repartition' => $repartition->id_repartition,
            'id_examen' => $exam->id_examen,
            'id_inscription_pedagogique' => $inscriptionPedagogique->id_inscription_pedagogique,
            'code_grille' => 1001,
            'code_anonymat' => '1001',
            'numero_place' => '1',
            'present' => true,
            'observation' => 'MAJ',
        ]);
    }

    private function createExam(SessionExamen $session, Module $module, Salle $salle, string $date, ?int $elementId = null): Examen
    {
        return Examen::create([
            'id_session_examen' => $session->id_session_examen,
            'id_module' => $module->id_module,
            'id_element' => $elementId,
            'id_salle' => $salle->id_salle,
            'date_examen' => $date,
            'date_debut' => $date . ' 08:00:00',
            'date_fin' => $date . ' 10:00:00',
            'statut' => 'Planifiee',
            'description' => 'Examen test',
        ]);
    }

    private function createPedagogicalRegistration(
        AnneeUniversitaire $annee,
        Niveau $niveau,
        Section $section,
        OffreFormation $offre,
        string $nom,
        string $prenom
    ): InscriptionPedagogique {
        $etudiant = Etudiant::factory()->create([
            'id_section' => $section->id_section,
            'nom' => $nom,
            'prenom' => $prenom,
        ]);

        $inscriptionAdministrative = InscriptionAdministrative::create([
            'id_etudiant' => $etudiant->id_etudiant,
            'id_annee' => $annee->id_annee,
            'id_niveau' => $niveau->id_niveau,
            'id_section' => $section->id_section,
            'date_inscription' => '2026-01-15',
            'statut' => 'Active',
            'type_inscription' => 'nouveau',
        ]);

        return InscriptionPedagogique::create([
            'id_inscription_admin' => $inscriptionAdministrative->id_inscription_admin,
            'id_offre' => $offre->id_offre,
            'type_inscription' => 'Normal',
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

    private function createRepartition(
        Examen $examen,
        InscriptionPedagogique $inscriptionPedagogique,
        string $codeGrille,
        string $numeroPlace
    ): RepartitionEtudiant {
        return RepartitionEtudiant::create([
            'id_examen' => $examen->id_examen,
            'id_inscription_pedagogique' => $inscriptionPedagogique->id_inscription_pedagogique,
            'code_grille' => $codeGrille,
            'code_anonymat' => $codeGrille,
            'numero_place' => $numeroPlace,
            'present' => false,
        ]);
    }
}
