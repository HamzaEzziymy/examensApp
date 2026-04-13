<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->unsignedBigInteger('id_offre')->nullable()->after('id_session_examen');
            $table->foreign('id_offre')->references('id_offre')->on('offre_formation')->onDelete('set null');
        });

        $examens = DB::table('examens')
            ->leftJoin('sessions_examen', 'sessions_examen.id_session_examen', '=', 'examens.id_session_examen')
            ->select([
                'examens.id_examen',
                'examens.id_module',
                'sessions_examen.id_annee',
                'sessions_examen.id_filiere',
            ])
            ->whereNull('examens.id_offre')
            ->whereNotNull('examens.id_module')
            ->orderBy('examens.id_examen')
            ->get();

        foreach ($examens as $examen) {
            $offreId = DB::table('offre_formation')
                ->leftJoin('sections', 'sections.id_section', '=', 'offre_formation.id_section')
                ->where('offre_formation.id_module', $examen->id_module)
                ->when($examen->id_annee, function ($query) use ($examen) {
                    $query->where('offre_formation.id_annee', $examen->id_annee);
                })
                ->when($examen->id_filiere, function ($query) use ($examen) {
                    $query->where('sections.id_filiere', $examen->id_filiere);
                })
                ->orderBy('offre_formation.id_offre')
                ->value('offre_formation.id_offre');

            if (! $offreId && $examen->id_annee) {
                $offreId = DB::table('offre_formation')
                    ->where('id_module', $examen->id_module)
                    ->where('id_annee', $examen->id_annee)
                    ->orderBy('id_offre')
                    ->value('id_offre');
            }

            if (! $offreId) {
                $offreId = DB::table('offre_formation')
                    ->where('id_module', $examen->id_module)
                    ->orderBy('id_offre')
                    ->value('id_offre');
            }

            if ($offreId) {
                DB::table('examens')
                    ->where('id_examen', $examen->id_examen)
                    ->update(['id_offre' => $offreId]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('examens', function (Blueprint $table) {
            $table->dropForeign(['id_offre']);
            $table->dropColumn('id_offre');
        });
    }
};
