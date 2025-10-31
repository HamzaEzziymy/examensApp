<?php

namespace Database\Factories;

use App\Models\SujetExamen;
use App\Models\Examen;
use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Factories\Factory;

class SujetExamenFactory extends Factory
{
    protected $model = SujetExamen::class;

    public function definition(): array
    {
        return [
            'id_examen'      => Examen::factory(),
            'version_sujet'  => $this->faker->randomElement(['Principal','A','B']),
            'chemin_fichier' => 'sujets/' . $this->faker->year() . '/sujet_' . $this->faker->unique()->bothify('####') . '.pdf',
            'id_auteur'      => Enseignant::factory(),
            'date_creation'  => $this->faker->dateTimeBetween('-2 months','now'),
            'statut'         => $this->faker->randomElement(['Brouillon','Valide','Pret pour tirage']),
        ];
    }
}
