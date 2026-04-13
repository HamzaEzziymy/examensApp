<?php

namespace Tests\Feature;

use App\Models\AnneeUniversitaire;
use App\Models\Examen;
use App\Models\Filiere;
use App\Models\Module;
use App\Models\Niveau;
use App\Models\OffreFormation;
use App\Models\Salle;
use App\Models\Section;
use App\Models\Semestre;
use App\Models\SessionExamen;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamenRelationTest extends TestCase
{
    use RefreshDatabase;

    public function test_exam_creation_resolves_offre_from_session_and_module_when_id_offre_is_missing(): void
    {
        $annee = AnneeUniversitaire::factory()->active()->create();
        $filiere = Filiere::factory()->create();
        $section = Section::factory()->create(['id_filiere' => $filiere->id_filiere]);
        $niveau = Niveau::factory()->create();
        $semestre = Semestre::factory()->create(['id_niveau' => $niveau->id_niveau]);
        $module = Module::factory()->create();
        $salle = Salle::factory()->create();

        $offre = OffreFormation::create([
            'id_module' => $module->id_module,
            'id_semestre' => $semestre->id_semestre,
            'id_section' => $section->id_section,
            'id_annee' => $annee->id_annee,
            'id_coordinateur' => null,
            'nom_affiche' => 'Offre test',
        ]);

        $session = SessionExamen::create([
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
            'nom_session' => 'Session test',
            'type_session' => 'Normale',
            'date_session_examen' => '2026-06-10',
            'quadrimestre' => 2,
        ]);

        $examen = Examen::create([
            'id_session_examen' => $session->id_session_examen,
            'id_module' => $module->id_module,
            'id_salle' => $salle->id_salle,
            'date_examen' => '2026-06-20',
            'date_debut' => '2026-06-20 09:00:00',
            'date_fin' => '2026-06-20 11:00:00',
            'statut' => 'Planifiee',
        ]);

        $examen->refresh();

        $this->assertSame($offre->id_offre, $examen->id_offre);
        $this->assertSame($module->id_module, $examen->module?->id_module);
        $this->assertSame($offre->id_offre, $examen->offreFormation?->id_offre);
    }
}
