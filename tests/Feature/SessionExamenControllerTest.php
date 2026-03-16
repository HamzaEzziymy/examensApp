<?php

namespace Tests\Feature;

use App\Models\AnneeUniversitaire;
use App\Models\Examen;
use App\Models\Filiere;
use App\Models\SessionExamen;
use App\Models\User;
use App\Models\UserFiliereAnnee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionExamenControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_creates_a_shared_session_even_if_a_filiere_is_posted(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create();

        $response = $this
            ->actingAs($user)
            ->post(route('examens.sessions.store'), [
                'id_filiere' => $filiere->id_filiere,
                'id_annee' => $annee->id_annee,
                'nom_session' => 'Session Normale Commune',
                'type_session' => 'Normale',
                'date_session_examen' => '2026-06-01',
                'quadrimestre' => 2,
                'description' => 'Session partagee',
            ]);

        $response
            ->assertRedirect(route('examens.sessions.index'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('sessions_examen', [
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Normale Commune',
            'type_session' => 'Normale',
            'quadrimestre' => 2,
            'id_filiere' => null,
        ]);
    }

    public function test_store_rejects_a_duplicate_shared_session_for_the_same_year_quadrimestre_and_type(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();

        SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session commune existante',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
            'description' => null,
        ]);

        $response = $this
            ->actingAs($user)
            ->from(route('examens.sessions.index'))
            ->post(route('examens.sessions.store'), [
                'id_annee' => $annee->id_annee,
                'nom_session' => 'Autre session normale',
                'type_session' => 'Normale',
                'date_session_examen' => '2026-06-15',
                'quadrimestre' => 2,
                'description' => null,
            ]);

        $response
            ->assertRedirect(route('examens.sessions.index'))
            ->assertSessionHasErrors('type_session');

        $this->assertSame(1, SessionExamen::count());
    }

    public function test_index_keeps_shared_sessions_visible_for_a_filtered_filiere(): void
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
            'description' => null,
        ]);

        SessionExamen::create([
            'id_filiere' => $selectedFiliere->id_filiere,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session medecine',
            'type_session' => 'Rattrapage',
            'date_session_examen' => '2026-07-01',
            'quadrimestre' => 2,
            'description' => null,
        ]);

        SessionExamen::create([
            'id_filiere' => $otherFiliere->id_filiere,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session pharmacie',
            'type_session' => 'Rattrapage',
            'date_session_examen' => '2026-07-02',
            'quadrimestre' => 2,
            'description' => null,
        ]);

        $response = $this
            ->actingAs($user)
            ->get(route('examens.sessions.index'));

        $response
            ->assertOk()
            ->assertSee('Session commune')
            ->assertSee('Session medecine')
            ->assertDontSee('Session pharmacie');
    }

    public function test_destroy_deletes_a_session_and_sets_examens_session_to_null(): void
    {
        $user = User::factory()->create();
        $annee = AnneeUniversitaire::factory()->active()->create();
        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session commune',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-01',
            'quadrimestre' => 2,
            'description' => null,
        ]);

        $examen = Examen::create([
            'id_session_examen' => $session->id_session_examen,
            'id_module' => null,
            'id_salle' => null,
            'date_examen' => '2026-06-10',
            'date_debut' => '2026-06-10 08:00:00',
            'date_fin' => '2026-06-10 10:00:00',
            'statut' => 'Planifiee',
            'description' => null,
        ]);

        $response = $this
            ->actingAs($user)
            ->delete(route('examens.sessions.destroy', $session));

        $response
            ->assertRedirect(route('examens.sessions.index'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('sessions_examen', [
            'id_session_examen' => $session->id_session_examen,
        ]);

        $this->assertDatabaseHas('examens', [
            'id_examen' => $examen->id_examen,
            'id_session_examen' => null,
        ]);
    }
}
