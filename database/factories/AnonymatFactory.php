<?php

namespace Database\Factories;

use App\Models\Anonymat;
use App\Models\Examen;
use App\Models\InscriptionPedagogique;
use Illuminate\Database\Eloquent\Factories\Factory;

class AnonymatFactory extends Factory
{
    protected $model = Anonymat::class;

    public function definition(): array
    {
        return [
            'id_examen'                 => Examen::factory(),
            'id_inscription_pedagogique'=> InscriptionPedagogique::factory(),
            'code_anonymat'             => strtoupper($this->faker->bothify('ANON-####')),
        ];
    }
}
