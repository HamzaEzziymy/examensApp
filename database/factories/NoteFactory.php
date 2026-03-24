<?php

namespace Database\Factories;

use App\Models\Note;
use App\Models\Anonymat;
use App\Models\Enseignant;
use Illuminate\Database\Eloquent\Factories\Factory;

class NoteFactory extends Factory
{
    protected $model = Note::class;

    public function configure(): static
    {
        $syncExam = function (Note $note): void {
            if ($note->id_examen || ! $note->id_anonymat) {
                return;
            }

            $note->id_examen = Anonymat::query()
                ->whereKey($note->id_anonymat)
                ->value('id_examen');
        };

        return $this
            ->afterMaking($syncExam)
            ->afterCreating(function (Note $note) use ($syncExam): void {
                $syncExam($note);

                if ($note->isDirty('id_examen')) {
                    $note->save();
                }
            });
    }

    public function definition(): array
    {
        return [
            'id_anonymat' => Anonymat::factory(),
            'id_examen' => null,
            'id_enseignant' => Enseignant::factory(),
            'note' => $this->faker->randomFloat(2, 0, 20),
            'note_sur' => 20,
            'date_saisie' => $this->faker->dateTimeBetween('-1 week', 'now'),
            'commentaire' => $this->faker->optional()->sentence(),
        ];
    }
}
