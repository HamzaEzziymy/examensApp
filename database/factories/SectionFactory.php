<?php

namespace Database\Factories;

use App\Models\Section;
use App\Models\Filiere;
use Illuminate\Database\Eloquent\Factories\Factory;

class SectionFactory extends Factory
{
    protected $model = Section::class;

    public function definition(): array
    {
        $langue = $this->faker->randomElement(['FR', 'EN', 'AR']);

        return [
            'id_filiere'  => Filiere::factory(),
            'nom_section' => 'Section ' . $langue . ' ' . ucfirst($this->faker->unique()->word()),
            'langue'      => $langue,
        ];
    }
}
