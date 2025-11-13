<?php

namespace Database\Factories;

use App\Models\Niveau;
use Illuminate\Database\Eloquent\Factories\Factory;

class NiveauFactory extends Factory
{
    protected $model = Niveau::class;

    public function definition(): array
    {
        return [
            'code_niveau'    => 'N' . $this->faker->unique()->numerify('###'),
            'nom_niveau'     => $this->faker->randomElement(['L1','L2','L3','M1','M2','D1','D2']) . ' ' . $this->faker->word(),
            'ordre'          => $this->faker->numberBetween(1, 12),
        ];
    }
}
