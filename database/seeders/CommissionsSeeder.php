<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Commission;
use App\Models\MembreCommission;
use App\Models\Enseignant;
use App\Models\Deliberation;
use App\Models\SessionExamen;
use App\Models\Niveau;
use App\Models\Reclamation;
use App\Models\InscriptionPedagogique;
use App\Models\ElementModule;
use App\Models\DecisionCommission;

class CommissionsSeeder extends Seeder
{
    public function run(): void
    {
        $enseignants = Enseignant::all();

        // Create a minimal commission
        $comms = Commission::factory()->count(1)->create();

        foreach ($comms as $c) {
            // Minimal membership
            MembreCommission::factory()->count(2)->create([
                'id_commission' => $c->id_commission,
                'id_enseignant' => $enseignants->random()->id_enseignant ?? null,
            ]);
        }

        // Single deliberation
        $sessions = SessionExamen::inRandomOrder()->take(1)->get();
        foreach ($sessions as $sess) {
            $niv = Niveau::inRandomOrder()->first();
            Deliberation::factory()->create([
                'id_session' => $sess->id_session_examen,
                'id_niveau'  => $niv?->id_niveau,
                'statut'     => 'Planifiee',
            ]);
        }

        // Reclamations: create for random registrations
        $ips = InscriptionPedagogique::inRandomOrder()->take(5)->get();
        foreach ($ips as $ip) {
            $element = ElementModule::where('id_module', $ip->id_module)->inRandomOrder()->first();
            Reclamation::factory()->create([
                'id_inscription_pedagogique' => $ip->id_inscription_pedagogique,
                'id_element_module'          => $element?->id_element,
                'id_session_examen'          => $sessions->random()->id_session_examen ?? null,
            ]);
        }

        // Decisions for each commission
        foreach ($comms as $c) {
            DecisionCommission::factory()->count(1)->create([
                'id_commission' => $c->id_commission,
            ]);
        }
    }
}
