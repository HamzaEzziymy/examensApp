<?php

namespace Database\Factories;

use App\Models\InscriptionAdministrative;
use App\Models\Etudiant;
use App\Models\AnneeUniversitaire;
use App\Models\Niveau;
use Illuminate\Database\Eloquent\Factories\Factory;

class InscriptionAdministrativeFactory extends Factory
{
    protected $model = InscriptionAdministrative::class;

    public function definition(): array
    {
        return [
            'id_etudiant'       => Etudiant::factory(),
            'id_annee'          => AnneeUniversitaire::factory(),
            'id_niveau'         => Niveau::factory(),
            'date_inscription'  => $this->faker->date(),
            'statut'            => $this->faker->randomElement(['Active','Suspendue','Archivee','Active']),
        ];
    }
}
