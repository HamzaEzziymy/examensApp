<?php

namespace Tests\Feature;

use App\Models\AnneeUniversitaire;
use App\Models\Anonymat;
use App\Models\Etudiant;
use App\Models\Examen;
use App\Models\Filiere;
use App\Models\InscriptionAdministrative;
use App\Models\InscriptionPedagogique;
use App\Models\Module;
use App\Models\Niveau;
use App\Models\OffreFormation;
use App\Models\Salle;
use App\Models\Section;
use App\Models\Semestre;
use App\Models\SessionExamen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NoteControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_students_by_cne_normalizes_cne_for_import_lookup(): void
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
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
        $student = Etudiant::factory()->create([
            'id_section' => $section->id_section,
            'cne' => 'r123456789',
            'nom' => 'Alpha',
            'prenom' => 'Import',
        ]);
        $administrativeRegistration = InscriptionAdministrative::create([
            'id_etudiant' => $student->id_etudiant,
            'id_annee' => $annee->id_annee,
            'id_niveau' => $niveau->id_niveau,
            'id_section' => $section->id_section,
            'date_inscription' => '2026-01-10',
            'statut' => 'Active',
            'type_inscription' => 'nouveau',
        ]);
        $pedagogicalRegistration = InscriptionPedagogique::create([
            'id_inscription_admin' => $administrativeRegistration->id_inscription_admin,
            'id_offre' => $offre->id_offre,
            'type_inscription' => 'Normal',
            'credits_acquis' => 0,
        ]);
        $salle = Salle::factory()->create();
        $session = SessionExamen::create([
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Normale',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
        ]);
        $exam = Examen::create([
            'id_session_examen' => $session->id_session_examen,
            'id_module' => $module->id_module,
            'id_salle' => $salle->id_salle,
            'date_examen' => '2026-06-10',
            'date_debut' => '2026-06-10 08:00:00',
            'date_fin' => '2026-06-10 10:00:00',
            'statut' => 'Planifiee',
            'description' => 'Examen test',
        ]);
        $anonymat = Anonymat::create([
            'id_examen' => $exam->id_examen,
            'id_inscription_pedagogique' => $pedagogicalRegistration->id_inscription_pedagogique,
            'code_anonymat' => '0001001',
        ]);

        $response = $this->postJson(route('correction.notes.students-by-cne'), [
            'cnes' => [' R123456789 '],
            'examen_id' => $exam->id_examen,
        ]);

        $response->assertOk();
        $payload = $response->json();

        $this->assertArrayHasKey('R123456789', $payload);
        $this->assertSame($anonymat->id_anonymat, $payload['R123456789']['anonymat']['id_anonymat']);
        $this->assertSame($student->id_etudiant, $payload['R123456789']['etudiant']['id_etudiant']);
    }
}
