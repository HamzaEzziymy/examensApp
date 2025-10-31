<?php

namespace Database\Factories;

use App\Models\ResultatElement;
use App\Models\InscriptionPedagogique;
use App\Models\ElementModule;
use App\Models\SessionExamen;
use Illuminate\Database\Eloquent\Factories\Factory;

class ResultatElementFactory extends Factory
{
    protected $model = ResultatElement::class;

    public function definition(): array
    {
        return [
            'id_inscription_pedagogique' => InscriptionPedagogique::factory(),
            'id_element'                 => ElementModule::factory(),
            'id_session_examen'          => SessionExamen::factory(),
            'moyenne_element'            => $this->faker->optional()->randomFloat(2, 0, 20),
            'statut'                     => $this->faker->randomElement(['En cours','Valide','Non Valide','Rattrapage']),
            'date_validation'            => $this->faker->optional()->date(),
        ];
    }
}
