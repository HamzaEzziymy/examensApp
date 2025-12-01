<?php

namespace Database\Factories;

use App\Models\Etudiant;
use App\Models\Filiere;
use App\Models\Section;
use Illuminate\Database\Eloquent\Factories\Factory;

class EtudiantFactory extends Factory
{
    protected $model = Etudiant::class;

    public function definition(): array
    {
        $nom = $this->faker->lastName();
        $prenom = $this->faker->firstName();

        return [
            'cne'             => strtoupper($this->faker->unique()->bothify('CNE########')),
            'nom'             => $nom,
            'prenom'          => $prenom,
            'mail_academique' => strtolower($prenom.'.'.$nom).'@etu.univ.example.ma',
            'mail_personnel'  => $this->faker->optional()->safeEmail(),
            'date_naissance'  => $this->faker->dateTimeBetween('-28 years','-18 years')->format('Y-m-d'),
            'telephone'       => $this->faker->optional()->phoneNumber(),
            'url_photo'       => $this->faker->optional()->imageUrl(300, 300, 'people', true),
            'id_filiere'      => null,
            'id_section'      => null,
        ];
    }

    public function configure()
    {
        return $this->afterMaking(function (Etudiant $etudiant) {
            if (! $etudiant->id_filiere) {
                $etudiant->id_filiere = Filiere::inRandomOrder()->value('id_filiere');
            }

            if (! $etudiant->id_section && $etudiant->id_filiere) {
                $etudiant->id_section = Section::where('id_filiere', $etudiant->id_filiere)
                    ->inRandomOrder()
                    ->value('id_section');
            }

            if (! $etudiant->id_filiere || ! $etudiant->id_section) {
                throw new \RuntimeException('Core academic data missing; seed CoreAcademicSeeder first.');
            }
        });
    }
}
