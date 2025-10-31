<?php

namespace Database\Factories;

use App\Models\Stage;
use App\Models\InscriptionPedagogique;
use App\Models\Module;
use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Factories\Factory;

class StageFactory extends Factory
{
    protected $model = Stage::class;

    public function definition(): array
    {
        $debut = $this->faker->dateTimeBetween('-1 years','+3 months');
        $fin   = (clone $debut)->modify('+'. $this->faker->numberBetween(7, 60) .' days');
        return [
            'id_inscription_pedagogique' => InscriptionPedagogique::factory(),
            'id_module'                  => Module::factory(),
            'nom_hopital'                => $this->faker->company() . ' Hospital',
            'service'                    => $this->faker->randomElement(['Pediatrie','Chirurgie','Urgences','Cardiologie']),
            'date_debut'                 => $debut->format('Y-m-d'),
            'date_fin'                   => $fin->format('Y-m-d'),
            'encadrant_hopital'          => $this->faker->name(),
            'encadrant_faculte'          => Enseignant::factory(),
            'note_stage'                 => $this->faker->optional()->randomFloat(2, 0, 20),
            'rapport_stage'              => $this->faker->optional()->filePath(),
        ];
    }
}
