<?php

namespace Database\Factories;

use App\Models\GrilleCorrection;
use App\Models\SujetExamen;
use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Factories\Factory;

class GrilleCorrectionFactory extends Factory
{
    protected $model = GrilleCorrection::class;

    public function definition(): array
    {
        $type = $this->faker->randomElement(['QCM','Bareme']);
        $contenu = $type === 'QCM'
            ? ['q1' => 'A', 'q2' => 'C', 'q3' => 'B']
            : [
                ['critere' => 'Exactitude', 'points' => 10],
                ['critere' => 'Méthodologie', 'points' => 5],
                ['critere' => 'Présentation', 'points' => 5],
            ];

        return [
            'id_sujet'       => SujetExamen::factory(),
            'type_grille'    => $type,
            'contenu_grille' => $contenu,
            'note_maximale'  => 20.00,
            'id_auteur'      => Enseignant::factory(),
            'date_creation'  => $this->faker->dateTimeBetween('-2 months','now'),
        ];
    }
}
