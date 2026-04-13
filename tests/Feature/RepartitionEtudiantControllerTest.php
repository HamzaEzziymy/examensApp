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

        $this->createRepartition($selectedExam, $selectedRegistration, '0001001', 'A101-001');
        $this->createRepartition($otherFiliereExam, $otherFiliereRegistration, '0001002', 'A101-002');
        $this->createRepartition($otherSemesterExam, $otherSemesterRegistration, '0001003', 'A101-003');
        $this->createRepartition($otherLevelExam, $otherLevelRegistration, '0001004', 'A101-004');

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
    }

    public function test_salles_places_export_uses_the_same_order_as_the_main_repartition_pdf(): void
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

        $this->createRepartition($exam, $zuluRegistration, '0001001', 'A101-003');
        $this->createRepartition($exam, $alphaRegistration, '0001002', 'A101-001');
        $this->createRepartition($exam, $betaRegistration, '0001003', 'A101-002');

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
    }

    public function test_salles_places_export_splits_each_salle_into_its_own_group(): void
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

        $alphaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Alpha', 'Bravo');
        $betaRegistration = $this->createPedagogicalRegistration($annee, $niveau, $section, $offre, 'Beta', 'Alpha');

        $this->createRepartition($exam, $alphaRegistration, '0001001', 'A101-001');
        $this->createRepartition($exam, $betaRegistration, '0002001', 'B202-001');

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
    }

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
        $this->createRepartition($exam, $registration, '0001001', 'A101-001');

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
        $this->createRepartition($exam, $registration, '0001001', 'A101-001');

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
            'numero_place' => 'A101-001',
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
