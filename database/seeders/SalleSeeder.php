<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Salle;

class SalleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $salles = [
            [
                'code_salle' => 'A101',
                'nom_salle' => 'Salle de cours A101',
                'capacite' => 50,
                'capacite_examens' => 30,
                'batiment' => 'Bâtiment A',
                'est_disponible' => true,
                'specificites' => 'Équipée d\'un projecteur et climatisée'
            ],
            [
                'code_salle' => 'A102',
                'nom_salle' => 'Salle de cours A102',
                'capacite' => 40,
                'capacite_examens' => 25,
                'batiment' => 'Bâtiment A',
                'est_disponible' => true,
                'specificites' => 'Tableau interactif'
            ],
            [
                'code_salle' => 'B201',
                'nom_salle' => 'Amphithéâtre B201',
                'capacite' => 120,
                'capacite_examens' => 80,
                'batiment' => 'Bâtiment B',
                'est_disponible' => true,
                'specificites' => 'Grand amphithéâtre avec système audio'
            ],
            [
                'code_salle' => 'C301',
                'nom_salle' => 'Laboratoire C301',
                'capacite' => 30,
                'capacite_examens' => 20,
                'batiment' => 'Bâtiment C',
                'est_disponible' => false,
                'specificites' => 'Laboratoire informatique - En maintenance'
            ],
            [
                'code_salle' => 'D401',
                'nom_salle' => 'Salle de conférence D401',
                'capacite' => 80,
                'capacite_examens' => 50,
                'batiment' => 'Bâtiment D',
                'est_disponible' => true,
                'specificites' => 'Salle de conférence avec équipement multimédia'
            ]
        ];

        foreach ($salles as $salle) {
            Salle::create($salle);
        }
    }
}