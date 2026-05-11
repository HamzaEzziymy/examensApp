<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('exam_salle', function (Blueprint $table) {
            $table->unsignedInteger('ordre')->nullable()->index();
        });

        $primarySalleByExam = DB::table('examens')
            ->pluck('id_salle', 'id_examen');

        DB::table('exam_salle')
            ->select('id_examen', 'id_salle', 'created_at')
            ->orderBy('id_examen')
            ->orderBy('id_salle')
            ->get()
            ->groupBy('id_examen')
            ->each(function ($rows, $examId) use ($primarySalleByExam) {
                $primarySalleId = (int) ($primarySalleByExam[$examId] ?? 0);

                $orderedRows = collect($rows)
                    ->sortBy(function ($row) use ($primarySalleId) {
                        $isPrimarySalle = (int) $row->id_salle === $primarySalleId ? 0 : 1;
                        $createdAt = $row->created_at ? (string) $row->created_at : '';

                        return sprintf(
                            '%d|%s|%010d',
                            $isPrimarySalle,
                            $createdAt,
                            (int) $row->id_salle
                        );
                    })
                    ->values();

                foreach ($orderedRows as $index => $row) {
                    DB::table('exam_salle')
                        ->where('id_examen', $examId)
                        ->where('id_salle', $row->id_salle)
                        ->update(['ordre' => $index + 1]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('exam_salle', function (Blueprint $table) {
            $table->dropColumn('ordre');
        });
    }
};
