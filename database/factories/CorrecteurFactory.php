<?php

namespace Database\Factories;

use App\Models\Correcteur;
use App\Models\Examen;
use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Factories\Factory;

class CorrecteurFactory extends Factory
{
    protected $model = Correcteur::class;

    public function definition(): array
    {
        return [
            'id_examen'              => Examen::factory(),
            'id_enseignant'          => Enseignant::factory(),
            'nombre_copies'          => $this->faker->numberBetween(10, 150),
            'date_attribution'       => $this->faker->date(),
            'date_limite_correction' => $this->faker->dateTimeBetween('now', '+1 month')->format('Y-m-d'),
            'statut'                 => $this->faker->randomElement(['Attribue','En cours','Termine']),
        ];
    }
}
