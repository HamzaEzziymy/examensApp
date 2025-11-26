<?php

namespace Database\Factories;

use App\Models\Filiere;
use App\Models\Faculte;
use Illuminate\Database\Eloquent\Factories\Factory;

class FiliereFactory extends Factory
{
    protected $model = Filiere::class;

    public function definition(): array
    {
        return [
            'id_faculte'  => Faculte::factory(),
            'nom_filiere' => strtoupper($this->faker->unique()->lexify('FILIERE-?????')),
        ];
    }
}
