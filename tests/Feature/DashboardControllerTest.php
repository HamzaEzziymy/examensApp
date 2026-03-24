<?php

namespace Tests\Feature;

use App\Http\Controllers\DashboardController;
use App\Models\AnneeUniversitaire;
use App\Models\Anonymat;
use App\Models\Examen;
use App\Models\Module;
use App\Models\Note;
use App\Models\Salle;
use App\Models\SessionExamen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use ReflectionMethod;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_notes_query_uses_the_exam_relation_after_the_correcteur_refactor(): void
    {
        $exam = $this->createExamWithNote();

        $controller = app(DashboardController::class);
        $method = new ReflectionMethod($controller, 'notesQuery');
        $method->setAccessible(true);

        $query = $method->invoke($controller, null, null);

        $this->assertSame(1, $query->count());
        $this->assertSame($exam->id_examen, $query->first()->id_examen);
    }

    private function createExamWithNote(): Examen
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $module = Module::factory()->create();
        $salle = Salle::factory()->create();
        $session = SessionExamen::create([
            'id_filiere' => null,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session Dashboard',
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
            'statut' => 'Terminee',
            'description' => 'Regression dashboard exam',
        ]);

        $anonymat = Anonymat::create([
            'id_examen' => $exam->id_examen,
            'id_inscription_pedagogique' => null,
            'code_anonymat' => 'ANON-0001',
        ]);

        Note::create([
            'id_anonymat' => $anonymat->id_anonymat,
            'id_examen' => $exam->id_examen,
            'id_enseignant' => null,
            'id_element' => null,
            'note' => '14',
            'note_sur' => 20,
            'date_saisie' => now(),
            'commentaire' => 'Regression note',
        ]);

        return $exam;
    }
}
