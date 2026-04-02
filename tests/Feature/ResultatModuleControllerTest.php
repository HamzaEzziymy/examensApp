<?php

namespace Tests\Feature;

use App\Http\Controllers\ResultatModuleController;
use App\Models\AnneeUniversitaire;
use App\Models\ElementModule;
use App\Models\Etudiant;
use App\Models\Filiere;
use App\Models\InscriptionAdministrative;
use App\Models\InscriptionPedagogique;
use App\Models\Module;
use App\Models\Niveau;
use App\Models\OffreFormation;
use App\Models\ResultatElement;
use App\Models\ResultatModule;
use App\Models\Section;
use App\Models\Semestre;
use App\Models\User;
use App\Models\UserFiliereAnnee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Spatie\LaravelPdf\PdfBuilder;
use Tests\TestCase;

class ResultatModuleControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_releve_notes_can_be_filtered_by_semester(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create(['annee_univ' => '2025/2026']);
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section A',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre1 = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
            'ordre' => 1,
        ]);
        $semestre2 = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S2',
            'ordre' => 2,
        ]);

        UserFiliereAnnee::create([
            'user_id' => $user->id,
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        $module1 = Module::factory()->create([
            'code_module' => 'MED-S1-001',
            'nom_module' => 'Anatomie Generale',
        ]);
        $module2 = Module::factory()->create([
            'code_module' => 'MED-S2-001',
            'nom_module' => 'Histologie',
        ]);

        $offre1 = OffreFormation::create([
            'id_module' => $module1->id_module,
            'id_semestre' => $semestre1->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);
        $offre2 = OffreFormation::create([
            'id_module' => $module2->id_module,
            'id_semestre' => $semestre2->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Histologie',
        ]);

        $student = Etudiant::factory()->create([
            'id_section' => $section->id_section,
            'nom' => 'Alpha',
            'prenom' => 'Etudiant',
            'cne' => 'CNE-ALPHA',
        ]);
        $admin = InscriptionAdministrative::create([
            'id_etudiant' => $student->id_etudiant,
            'id_annee' => $annee->id_annee,
            'id_niveau' => $niveau->id_niveau,
            'id_section' => $section->id_section,
            'date_inscription' => '2026-01-10',
            'statut' => 'Active',
            'type_inscription' => 'nouveau',
        ]);

        $ip1 = InscriptionPedagogique::create([
            'id_inscription_admin' => $admin->id_inscription_admin,
            'id_offre' => $offre1->id_offre,
            'type_inscription' => 'Normal',
            'credits_acquis' => 0,
        ]);
        $ip2 = InscriptionPedagogique::create([
            'id_inscription_admin' => $admin->id_inscription_admin,
            'id_offre' => $offre2->id_offre,
            'type_inscription' => 'Normal',
            'credits_acquis' => 0,
        ]);

        ResultatModule::create([
            'id_inscription_pedagogique' => $ip1->id_inscription_pedagogique,
            'id_module' => $module1->id_module,
            'moyenne_module' => 14.50,
            'statut' => 'Valide',
            'date_validation' => '2026-06-20',
            'est_anticipe' => false,
        ]);
        ResultatModule::create([
            'id_inscription_pedagogique' => $ip2->id_inscription_pedagogique,
            'id_module' => $module2->id_module,
            'moyenne_module' => 9.50,
            'statut' => 'Rattrapage',
            'date_validation' => '2026-06-21',
            'est_anticipe' => false,
        ]);

        $this->actingAs($user);

        $controller = app(ResultatModuleController::class);
        $request = Request::create(route('correction.resultats-modules.export-releve-notes'), 'GET', [
            'semester_id' => $semestre1->id_semestre,
        ]);

        $pdf = $controller->exportReleveNotes($request);

        $this->assertInstanceOf(PdfBuilder::class, $pdf);
        $this->assertSame('pdfs.releve-notes-grouped', $pdf->viewName);
        $this->assertSame('a3', $pdf->format);
        $this->assertSame('Landscape', $pdf->orientation);
        $this->assertSame('S1', $pdf->viewData['selectedSemesterLabel']);

        $students = collect($pdf->viewData['students']);
        $this->assertCount(1, $students);

        $modules = collect($students->first()['modules']);
        $this->assertCount(1, $modules);
        $this->assertSame('MED-S1-001', $modules->first()['code_module']);
    }

    public function test_export_releve_notes_contains_module_and_element_marks_with_module_status_per_student(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create(['annee_univ' => '2025/2026']);
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section A',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
            'ordre' => 1,
        ]);

        $otherFiliere = Filiere::factory()->create(['nom_filiere' => 'Pharmacie']);
        $otherSection = Section::factory()->create([
            'id_filiere' => $otherFiliere->id_filiere,
            'nom_section' => 'Section P',
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
        $element1 = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'MED-EL-1',
            'nom_element' => 'Cours magistral',
        ]);
        $element2 = ElementModule::factory()->create([
            'id_module' => $module->id_module,
            'code_element' => 'MED-EL-2',
            'nom_element' => 'Travaux pratiques',
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
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $otherSection->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Anatomie Generale',
        ]);

        $student = Etudiant::factory()->create([
            'id_section' => $section->id_section,
            'nom' => 'Alpha',
            'prenom' => 'Etudiant',
            'cne' => 'CNE-ALPHA',
        ]);
        $admin = InscriptionAdministrative::create([
            'id_etudiant' => $student->id_etudiant,
            'id_annee' => $annee->id_annee,
            'id_niveau' => $niveau->id_niveau,
            'id_section' => $section->id_section,
            'date_inscription' => '2026-01-10',
            'statut' => 'Active',
            'type_inscription' => 'nouveau',
        ]);
        $pedagogicalRegistration = InscriptionPedagogique::create([
            'id_inscription_admin' => $admin->id_inscription_admin,
            'id_offre' => $offre->id_offre,
            'type_inscription' => 'Normal',
            'credits_acquis' => 0,
        ]);

        ResultatModule::create([
            'id_inscription_pedagogique' => $pedagogicalRegistration->id_inscription_pedagogique,
            'id_module' => $module->id_module,
            'moyenne_module' => 14.50,
            'statut' => 'Valide',
            'date_validation' => '2026-06-20',
            'est_anticipe' => false,
        ]);
        ResultatElement::create([
            'id_inscription_pedagogique' => $pedagogicalRegistration->id_inscription_pedagogique,
            'id_element' => $element1->id_element,
            'id_session_examen' => null,
            'moyenne_element' => 16.00,
            'statut' => 'Valide',
            'date_validation' => '2026-06-19',
        ]);
        ResultatElement::create([
            'id_inscription_pedagogique' => $pedagogicalRegistration->id_inscription_pedagogique,
            'id_element' => $element2->id_element,
            'id_session_examen' => null,
            'moyenne_element' => 11.75,
            'statut' => 'Rattrapage',
            'date_validation' => '2026-06-19',
        ]);

        $otherStudent = Etudiant::factory()->create([
            'id_section' => $otherSection->id_section,
            'nom' => 'Beta',
            'prenom' => 'Exclu',
            'cne' => 'CNE-BETA',
        ]);
        $otherAdmin = InscriptionAdministrative::create([
            'id_etudiant' => $otherStudent->id_etudiant,
            'id_annee' => $annee->id_annee,
            'id_niveau' => $niveau->id_niveau,
            'id_section' => $otherSection->id_section,
            'date_inscription' => '2026-01-10',
            'statut' => 'Active',
            'type_inscription' => 'nouveau',
        ]);
        $otherRegistration = InscriptionPedagogique::create([
            'id_inscription_admin' => $otherAdmin->id_inscription_admin,
            'id_offre' => $otherOffre->id_offre,
            'type_inscription' => 'Normal',
            'credits_acquis' => 0,
        ]);
        ResultatModule::create([
            'id_inscription_pedagogique' => $otherRegistration->id_inscription_pedagogique,
            'id_module' => $module->id_module,
            'moyenne_module' => 8.00,
            'statut' => 'Non Valide',
            'date_validation' => '2026-06-20',
            'est_anticipe' => false,
        ]);

        $this->actingAs($user);

        $controller = app(ResultatModuleController::class);
        $request = Request::create(route('correction.resultats-modules.export-releve-notes'), 'GET');

        $pdf = $controller->exportReleveNotes($request);

        $this->assertInstanceOf(PdfBuilder::class, $pdf);
        $this->assertSame('pdfs.releve-notes-grouped', $pdf->viewName);
        $this->assertSame('a3', $pdf->format);
        $this->assertSame('Landscape', $pdf->orientation);
        $this->assertSame('Medecine', $pdf->viewData['filiereLabel']);
        $this->assertSame('2025/2026', $pdf->viewData['anneeLabel']);

        $students = collect($pdf->viewData['students']);
        $this->assertCount(1, $students);

        $studentPayload = $students->first();
        $this->assertSame('CNE-ALPHA', $studentPayload['cne']);
        $this->assertSame('Alpha', $studentPayload['nom']);
        $this->assertSame('Etudiant', $studentPayload['prenom']);

        $modules = collect($studentPayload['modules']);
        $this->assertCount(1, $modules);

        $modulePayload = $modules->first();
        $this->assertSame('MED-S1-001', $modulePayload['code_module']);
        $this->assertSame(14.5, $modulePayload['moyenne_module']);
        $this->assertSame('Valide', $modulePayload['statut_module']);

        $elements = collect($modulePayload['elements'])->keyBy('code_element');
        $this->assertSame(16.0, $elements['MED-EL-1']['moyenne_element']);
        $this->assertSame('Valide', $elements['MED-EL-1']['statut_element']);
        $this->assertSame(11.75, $elements['MED-EL-2']['moyenne_element']);
        $this->assertSame('Rattrapage', $elements['MED-EL-2']['statut_element']);
    }

    public function test_export_releve_notes_can_be_filtered_by_student(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create(['annee_univ' => '2025/2026']);
        $filiere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $section = Section::factory()->create([
            'id_filiere' => $filiere->id_filiere,
            'nom_section' => 'Section A',
        ]);
        $niveau = Niveau::factory()->create(['nom_niveau' => 'Licence 1']);
        $semestre = Semestre::factory()->create([
            'id_niveau' => $niveau->id_niveau,
            'nom_semestre' => 'S1',
            'ordre' => 1,
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

        $selectedStudent = Etudiant::factory()->create([
            'id_section' => $section->id_section,
            'nom' => 'Alpha',
            'prenom' => 'Choisi',
            'cne' => 'CNE-ALPHA',
        ]);
        $otherStudent = Etudiant::factory()->create([
            'id_section' => $section->id_section,
            'nom' => 'Beta',
            'prenom' => 'Ignore',
            'cne' => 'CNE-BETA',
        ]);

        $selectedAdmin = InscriptionAdministrative::create([
            'id_etudiant' => $selectedStudent->id_etudiant,
            'id_annee' => $annee->id_annee,
            'id_niveau' => $niveau->id_niveau,
            'id_section' => $section->id_section,
            'date_inscription' => '2026-01-10',
            'statut' => 'Active',
            'type_inscription' => 'nouveau',
        ]);
        $otherAdmin = InscriptionAdministrative::create([
            'id_etudiant' => $otherStudent->id_etudiant,
            'id_annee' => $annee->id_annee,
            'id_niveau' => $niveau->id_niveau,
            'id_section' => $section->id_section,
            'date_inscription' => '2026-01-10',
            'statut' => 'Active',
            'type_inscription' => 'nouveau',
        ]);

        $selectedIp = InscriptionPedagogique::create([
            'id_inscription_admin' => $selectedAdmin->id_inscription_admin,
            'id_offre' => $offre->id_offre,
            'type_inscription' => 'Normal',
            'credits_acquis' => 0,
        ]);
        $otherIp = InscriptionPedagogique::create([
            'id_inscription_admin' => $otherAdmin->id_inscription_admin,
            'id_offre' => $offre->id_offre,
            'type_inscription' => 'Normal',
            'credits_acquis' => 0,
        ]);

        ResultatModule::create([
            'id_inscription_pedagogique' => $selectedIp->id_inscription_pedagogique,
            'id_module' => $module->id_module,
            'moyenne_module' => 15.00,
            'statut' => 'Valide',
            'date_validation' => '2026-06-20',
            'est_anticipe' => false,
        ]);
        ResultatModule::create([
            'id_inscription_pedagogique' => $otherIp->id_inscription_pedagogique,
            'id_module' => $module->id_module,
            'moyenne_module' => 7.50,
            'statut' => 'Non Valide',
            'date_validation' => '2026-06-20',
            'est_anticipe' => false,
        ]);

        $this->actingAs($user);

        $controller = app(ResultatModuleController::class);
        $request = Request::create(route('correction.resultats-modules.export-releve-notes'), 'GET', [
            'student_id' => $selectedStudent->id_etudiant,
        ]);

        $pdf = $controller->exportReleveNotes($request);

        $this->assertInstanceOf(PdfBuilder::class, $pdf);
        $this->assertSame('pdfs.releve-notes', $pdf->viewName);
        $this->assertSame('a4', $pdf->format);
        $this->assertSame('Portrait', $pdf->orientation);
        $this->assertSame('Alpha Choisi', $pdf->viewData['selectedStudentLabel']);

        $students = collect($pdf->viewData['students']);
        $this->assertCount(1, $students);
        $this->assertSame('CNE-ALPHA', $students->first()['cne']);
    }
}
