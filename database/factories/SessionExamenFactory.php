<?php

namespace Database\Factories;

use App\Models\SessionExamen;
use App\Models\Filiere;
use App\Models\AnneeUniversitaire;
use Illuminate\Database\Eloquent\Factories\Factory;

class SessionExamenFactory extends Factory
{
    protected $model = SessionExamen::class;

    public function definition(): array
    {
        return [
            'id_filiere'          => Filiere::factory(),
            'id_annee'            => AnneeUniversitaire::factory(),
            'nom_session'         => $this->faker->randomElement(['Session Principale','Session de Rattrapage','Session Exceptionnelle']),
            'type_session'        => $this->faker->randomElement(['Normale','Rattrapage','Exceptionnelle']),
            'date_session_examen' => $this->faker->date(),
            'quadrimestre'        => $this->faker->numberBetween(1, 8),
            'description'         => $this->faker->optional()->sentence(),
        ];
    }
}
