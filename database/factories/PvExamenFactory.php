<?php

namespace Database\Factories;

use App\Models\PvExamen;
use App\Models\Examen;
use Illuminate\Database\Eloquent\Factories\Factory;

class PvExamenFactory extends Factory
{
    protected $model = PvExamen::class;

    public function definition(): array
    {
        return [
            'id_examen'          => Examen::factory(),
            'date_creation'      => now(),
            'nombre_presents'    => $this->faker->numberBetween(10, 300),
            'nombre_absents'     => $this->faker->numberBetween(0, 50),
            'incidents_signales' => $this->faker->boolean(20),
            'observations'       => $this->faker->optional()->sentence(),
        ];
    }
}
