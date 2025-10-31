<?php

namespace Database\Factories;

use App\Models\RepartitionEtudiant;
use App\Models\Examen;
use App\Models\InscriptionPedagogique;
use Illuminate\Database\Eloquent\Factories\Factory;

class RepartitionEtudiantFactory extends Factory
{
    protected $model = RepartitionEtudiant::class;

    public function definition(): array
    {
        return [
            'id_examen'                 => Examen::factory(),
            'id_inscription_pedagogique'=> InscriptionPedagogique::factory(),
            'code_grille'               => $this->faker->numberBetween(1, 3),
            'code_anonymat'             => $this->faker->optional()->bothify('ANON-####'),
            'numero_place'              => $this->faker->optional()->bothify('P-###'),
            'present'                   => $this->faker->boolean(80),
            'heure_arrivee'             => $this->faker->optional()->time('H:i:s'),
            'heure_sortie'              => $this->faker->optional()->time('H:i:s'),
            'observation'               => $this->faker->optional()->sentence(),
        ];
    }
}
