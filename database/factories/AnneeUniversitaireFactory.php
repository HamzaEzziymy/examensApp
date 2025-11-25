<?php

namespace Database\Factories;

use App\Models\AnneeUniversitaire;
use Illuminate\Database\Eloquent\Factories\Factory;

class AnneeUniversitaireFactory extends Factory
{
    protected $model = AnneeUniversitaire::class;

    public function definition(): array
    {
        // academic year format: 2025/2026
        $start = $this->faker->unique()->numberBetween(2018, 2035);
        $annee = sprintf('%d/%d', $start, $start + 1);

        return [
            'annee_univ' => $annee,
            'date_debut' => "{$start}-09-01",
            'date_fin'   => ($start + 1) . "-07-31",
            'est_active' => $this->faker->boolean(20),
        ];
    }

    public function active(): self
    {
        return $this->state(fn () => ['est_active' => true]);
    }
}
