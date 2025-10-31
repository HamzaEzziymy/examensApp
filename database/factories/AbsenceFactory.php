<?php

namespace Database\Factories;

use App\Models\Absence;
use App\Models\Examen;
use App\Models\Anonymat;
use Illuminate\Database\Eloquent\Factories\Factory;

class AbsenceFactory extends Factory
{
    protected $model = Absence::class;

    public function definition(): array
    {
        return [
            'id_examen'     => Examen::factory(),
            'id_anonymat'   => Anonymat::factory(),
            'date_absence'  => $this->faker->date(),
            'motif'         => $this->faker->optional()->sentence(),
            'justificatif'  => $this->faker->optional()->filePath(),
            'statut'        => $this->faker->randomElement(['Non justifiee','Justifiee','En attente']),
        ];
    }
}
