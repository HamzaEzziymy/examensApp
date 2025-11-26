<?php

namespace Database\Factories;

use App\Models\Examen;
use App\Models\SessionExamen;
use App\Models\Module;
use App\Models\Salle;
use Illuminate\Database\Eloquent\Factories\Factory;

class ExamenFactory extends Factory
{
    protected $model = Examen::class;

    public function configure()
    {
        return $this->afterCreating(function (Examen $examen) {
            // Attach the primary salle (or a random one) to the pivot so multi-salle is always populated
            $primarySalleId = $examen->id_salle ?? Salle::inRandomOrder()->value('id_salle');
            if ($primarySalleId) {
                $extra = Salle::where('id_salle', '!=', $primarySalleId)->inRandomOrder()->limit(2)->pluck('id_salle');
                $examen->salles()->sync(array_filter([$primarySalleId, ...$extra]));
            }
        });
    }

    public function definition(): array
    {
        $start = $this->faker->dateTimeBetween('-1 months', '+2 months');
        $end   = (clone $start)->modify('+'. $this->faker->numberBetween(60, 180) .' minutes');

        return [
            'id_session_examen' => SessionExamen::factory(),
            'id_module'         => Module::factory(),
            'id_salle'          => Salle::factory(),
            'date_examen'       => $start->format('Y-m-d'),
            'date_debut'        => $start->format('Y-m-d H:i:s'),
            'date_fin'          => $end->format('Y-m-d H:i:s'),
            'statut'            => $this->faker->randomElement(['Planifiee','En cours','Terminee','Annulee']),
            'description'       => $this->faker->optional()->paragraph(),
        ];
    }
}
