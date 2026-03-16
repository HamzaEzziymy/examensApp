<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->recreateForeignKey('examens', 'id_session_examen', 'sessions_examen', 'id_session_examen', true);
        $this->recreateForeignKey('resultats_elements', 'id_session_examen', 'sessions_examen', 'id_session_examen', true);
        $this->recreateForeignKey('reclamations', 'id_session_examen', 'sessions_examen', 'id_session_examen', true);
        $this->recreateForeignKey('deliberations', 'id_session', 'sessions_examen', 'id_session_examen', true);
    }

    public function down(): void
    {
        $this->recreateForeignKey('examens', 'id_session_examen', 'sessions_examen', 'id_session_examen', false);
        $this->recreateForeignKey('resultats_elements', 'id_session_examen', 'sessions_examen', 'id_session_examen', false);
        $this->recreateForeignKey('reclamations', 'id_session_examen', 'sessions_examen', 'id_session_examen', false);
        $this->recreateForeignKey('deliberations', 'id_session', 'sessions_examen', 'id_session_examen', false);
    }

    private function recreateForeignKey(
        string $tableName,
        string $column,
        string $referencedTable,
        string $referencedColumn,
        bool $setNullOnDelete
    ): void {
        Schema::table($tableName, function (Blueprint $table) use ($column, $referencedTable, $referencedColumn, $setNullOnDelete) {
            $table->dropForeign([$column]);

            $foreign = $table
                ->foreign($column)
                ->references($referencedColumn)
                ->on($referencedTable);

            if ($setNullOnDelete) {
                $foreign->nullOnDelete();
                return;
            }

            $foreign->restrictOnDelete();
        });
    }
};
