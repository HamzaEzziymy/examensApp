<?php

namespace Database\Factories;

use App\Models\Semestre;
use App\Models\Niveau;
use Illuminate\Database\Eloquent\Factories\Factory;

class SemestreFactory extends Factory
{
    protected $model = Semestre::class;

    public function definition(): array
    {
        return [
            'code_semestre'   => 'S' . $this->faker->unique()->numerify('####'),
            'nom_semestre'    => 'Semestre ' . $this->faker->numberBetween(1, 12),
            'id_niveau'       => Niveau::factory(),
            'ordre'           => $this->faker->numberBetween(1, 12),
        ];
    }
}
