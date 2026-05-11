<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('anonymat_semestres', function (Blueprint $table) {
            $table->id('id_anonymat_semestre');
            $table->unsignedBigInteger('id_inscription_admin');
            $table->unsignedBigInteger('id_semestre');
            $table->unsignedBigInteger('id_annee');
            $table->string('code_anonymat', 20);
            $table->timestamps();

            $table->foreign('id_inscription_admin')
                ->references('id_inscription_admin')
                ->on('inscriptions_administratives')
                ->onDelete('cascade');
            $table->foreign('id_semestre')
                ->references('id_semestre')
                ->on('semestres')
                ->onDelete('cascade');
            $table->foreign('id_annee')
                ->references('id_annee')
                ->on('annees_universitaires')
                ->onDelete('cascade');

            $table->unique(
                ['id_annee', 'id_semestre', 'id_inscription_admin'],
                'anonymat_semestres_unique_student'
            );
            $table->unique(
                ['id_annee', 'id_semestre', 'code_anonymat'],
                'anonymat_semestres_unique_code'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anonymat_semestres');
    }
};
