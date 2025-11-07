<?php

namespace Database\Factories;

use App\Models\Filiere;
use App\Models\AnneeUniversitaire;
use Illuminate\Database\Eloquent\Factories\Factory;

class FiliereFactory extends Factory
{
    protected $model = Filiere::class;

    public function definition(): array
    {
        return [
            'id_annee'    => AnneeUniversitaire::factory(),
            'nom_filiere' => $this->faker->unique()->words(3, true),
            'code_filiere'=> strtoupper($this->faker->unique()->bothify('FIL###')),
        ];
    }
}
