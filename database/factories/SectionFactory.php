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
        $filiereId = Filiere::inRandomOrder()->value('id_filiere');

        if (! $filiereId) {
            throw new \RuntimeException('No filiere available; seed CoreAcademicSeeder first.');
        }

        return [
            'id_filiere'  => $filiereId,
            'nom_section' => 'Section ' . $langue . ' ' . ucfirst($this->faker->unique()->lexify('??????')),
            'langue'      => $langue,
        ];
    }
}
