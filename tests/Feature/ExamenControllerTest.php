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

    public function test_store_falls_back_when_the_preferred_filiere_filter_hides_existing_students(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $realFiliere = Filiere::factory()->create(['nom_filiere' => 'Medecine']);
        $wrongFiliere = Filiere::factory()->create(['nom_filiere' => 'Pharmacie']);
        $section = Section::factory()->create(['id_filiere' => $realFiliere->id_filiere]);
        $niveau = Niveau::factory()->create();
        $semestre = Semestre::factory()->create(['id_niveau' => $niveau->id_niveau]);
        $module = Module::factory()->create();
        $salle = Salle::factory()->create([
            'capacite' => 40,
            'capacite_examens' => 40,
        ]);

        UserFiliereAnnee::create([
            'user_id' => $user->id,
            'id_filiere' => $wrongFiliere->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Offre fallback',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-12',
            'quadrimestre' => 2,
        ]);

        $etudiant = Etudiant::factory()->create([
            'id_section' => $section->id_section,
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
                'description' => 'Examen commun fallback',
            ]);

        $response
            ->assertRedirect(route('examens.examens.index'))
            ->assertSessionHasNoErrors();

        $examen = Examen::query()->latest('id_examen')->first();

        $this->assertNotNull($examen);
        $this->assertDatabaseHas('repartition_etudiants', [
            'id_examen' => $examen->id_examen,
            'id_inscription_pedagogique' => $inscriptionPedagogique->id_inscription_pedagogique,
        ]);
    }
}
