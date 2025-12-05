<?php

namespace Database\Factories;

use App\Models\Etudiant;
use App\Models\Section;
use Illuminate\Database\Eloquent\Factories\Factory;

class EtudiantFactory extends Factory
{
    protected $model = Etudiant::class;

    public function definition(): array
    {
        $nom = $this->faker->lastName();
        $prenom = $this->faker->firstName();
        // Suffix large enough to avoid exhausting Faker's unique pool
        $uniqueSuffix = $this->faker->unique()->regexify('[a-z0-9]{6}');
        return [
            'cne'             => strtoupper($this->faker->unique()->bothify('CNE########')),
            'nom'             => $nom,
            'prenom'          => $prenom,
            'mail_academique' => strtolower($prenom.'.'.$nom.'.'.$uniqueSuffix).'@etu.univ.example.ma',
            'mail_personnel'  => $this->faker->boolean(70) ? $this->faker->unique()->safeEmail() : null,
            'date_naissance'  => $this->faker->dateTimeBetween('-28 years','-18 years')->format('Y-m-d'),
            'telephone'       => $this->faker->optional()->phoneNumber(),
            'url_photo'       => $this->faker->optional()->imageUrl(300, 300, 'people', true),
            'id_section'      => null,
        ];
    }

    public function configure()
    {
        return $this->afterMaking(function (Etudiant $etudiant) {
            // If no section provided, pick a random one
            if (! $etudiant->id_section) {
                $etudiant->id_section = Section::inRandomOrder()->value('id_section');
            }

            if (! $etudiant->id_section) {
                throw new \RuntimeException('Core academic data missing; seed CoreAcademicSeeder first.');
            }
        });
    }
}
