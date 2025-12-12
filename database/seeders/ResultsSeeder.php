<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\InscriptionPedagogique;
use App\Models\ElementModule;
use App\Models\SessionExamen;
use App\Models\ResultatElement;
use App\Models\ResultatModule;

class ResultsSeeder extends Seeder
{
    public function run(): void
    {
        $sessions = SessionExamen::all();

        $registrations = InscriptionPedagogique::with('offreFormation.module')
            ->orderBy('id_inscription_pedagogique')
            ->limit(20)
            ->get();

        foreach ($registrations as $ip) {
            $module = $ip->offreFormation?->module;
            if (! $module) {
                continue;
            }

            // Pick a session (random) and a single element from the module
            $session = $sessions->random() ?? null;

            $element = ElementModule::where('id_module', $module->id_module)->first();
            if ($element) {
                ResultatElement::factory()->create([
                    'id_inscription_pedagogique' => $ip->id_inscription_pedagogique,
                    'id_element'                 => $element->id_element,
                    'id_session_examen'          => $session?->id_session_examen,
                ]);
            }

            // Module result aggregated
            ResultatModule::factory()->create([
                'id_inscription_pedagogique' => $ip->id_inscription_pedagogique,
                'id_module'                  => $module->id_module,
            ]);
        }
    }
}
