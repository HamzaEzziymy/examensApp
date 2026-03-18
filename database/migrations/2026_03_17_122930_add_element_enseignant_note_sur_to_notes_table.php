<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            // Add id_element relationship
            $table->unsignedBigInteger('id_element')->nullable()->after('id_examen');
            $table->foreign('id_element')->references('id_element')->on('elements_module')->onDelete('set null');
            
            // Add id_enseignant relationship
            $table->unsignedBigInteger('id_enseignant')->nullable()->after('id_correcteur');
            $table->foreign('id_enseignant')->references('id_enseignant')->on('enseignants')->onDelete('set null');
            
            // Add note_sur field (maximum value for the note)
            $table->decimal('note_sur', 5, 2)->default(20.00)->after('note');
            
            // Modify note column to allow string values (ABS, CAP)
            // We'll change it to VARCHAR to support both numeric and string values
            $table->string('note', 10)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropForeign(['id_element']);
            $table->dropColumn('id_element');
            
            $table->dropForeign(['id_enseignant']);
            $table->dropColumn('id_enseignant');
            
            $table->dropColumn('note_sur');
            
            // Revert note column back to decimal
            $table->decimal('note', 5, 2)->change();
        });
    }
};
