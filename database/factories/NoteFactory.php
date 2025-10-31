<?php

namespace Database\Factories;

use App\Models\Note;
use App\Models\Anonymat;
use App\Models\Correcteur;
use Illuminate\Database\Eloquent\Factories\Factory;

class NoteFactory extends Factory
{
    protected $model = Note::class;

    public function definition(): array
    {
        return [
            'id_anonymat'   => Anonymat::factory(),
            'id_correcteur' => Correcteur::factory(),
            'note'          => $this->faker->randomFloat(2, 0, 20),
            'date_saisie'   => $this->faker->dateTimeBetween('-1 week','now'),
            'commentaire'   => $this->faker->optional()->sentence(),
        ];
    }
}
