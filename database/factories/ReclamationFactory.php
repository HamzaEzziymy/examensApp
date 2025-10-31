<?php

namespace Database\Factories;

use App\Models\Reclamation;
use App\Models\InscriptionPedagogique;
use App\Models\ElementModule;
use App\Models\SessionExamen;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReclamationFactory extends Factory
{
    protected $model = Reclamation::class;

    public function definition(): array
    {
        return [
            'id_inscription_pedagogique' => InscriptionPedagogique::factory(),
            'id_element_module'          => ElementModule::factory(),
            'id_session_examen'          => SessionExamen::factory(),
            'date_reclamation'           => $this->faker->date(),
            'motif'                      => $this->faker->optional()->sentence(),
            'decision'                   => $this->faker->optional()->sentence(),
            'statut'                     => $this->faker->randomElement(['Soumise','En cours','Traitee','Rejetee']),
        ];
    }
}
