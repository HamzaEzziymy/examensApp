<?php

namespace Database\Factories;

use App\Models\OffreFormation;
use App\Models\Module;
use App\Models\Semestre;
use App\Models\Section;
use App\Models\AnneeUniversitaire;
use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Factories\Factory;

class OffreFormationFactory extends Factory
{
    protected $model = OffreFormation::class;

    public function definition(): array
    {
        $anneeId = AnneeUniversitaire::where('est_active', true)->latest('date_debut')->value('id_annee')
            ?? AnneeUniversitaire::latest('date_debut')->value('id_annee')
            ?? AnneeUniversitaire::factory()->create()->id_annee;

        $moduleId = Module::inRandomOrder()->value('id_module') ?? Module::factory();
        $semestreId = Semestre::inRandomOrder()->value('id_semestre') ?? Semestre::factory();
        $sectionId = Section::inRandomOrder()->value('id_section') ?? Section::factory();
        $coordinateurId = Enseignant::inRandomOrder()->value('id_enseignant') ?? Enseignant::factory();

        return [
            'id_module'       => $moduleId,
            'id_semestre'     => $semestreId,
            'id_section'      => $sectionId,
            'id_annee'        => $anneeId,
            'id_coordinateur' => $coordinateurId,
            'nom_affiche'     => $this->faker->sentence(3),
        ];
    }
}
