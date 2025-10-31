<?php

namespace Database\Factories;

use App\Models\Deliberation;
use App\Models\SessionExamen;
use App\Models\Niveau;
use Illuminate\Database\Eloquent\Factories\Factory;

class DeliberationFactory extends Factory
{
    protected $model = Deliberation::class;

    public function definition(): array
    {
        return [
            'id_session'        => SessionExamen::factory(),
            'id_niveau'         => Niveau::factory(),
            'date_deliberation' => $this->faker->date(),
            'statut'            => $this->faker->randomElement(['Planifiee','En cours','Terminee']),
        ];
    }
}
