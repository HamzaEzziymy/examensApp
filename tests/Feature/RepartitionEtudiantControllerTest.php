<?php

namespace Tests\Feature;

use App\Http\Controllers\RepartitionEtudiantController;
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
use App\Models\User;
use App\Models\UserFiliereAnnee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
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
        ]);
        $semestre2 = Semestre::factory()->create([
            'id_niveau' => $niveauLicence1->id_niveau,
            'nom_semestre' => 'S2',
        ]);
        $semestre3 = Semestre::factory()->create([
            'id_niveau' => $niveauLicence2->id_niveau,
            'nom_semestre' => 'S3',
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

    private function createExam(SessionExamen $session, Module $module, Salle $salle, string $date): Examen
    {
        return Examen::create([
            'id_session_examen' => $session->id_session_examen,
            'id_module' => $module->id_module,
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
