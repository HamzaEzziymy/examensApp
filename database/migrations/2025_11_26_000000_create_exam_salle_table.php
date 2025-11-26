<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('exam_salle', function (Blueprint $table) {
            $table->unsignedBigInteger('id_examen');
            $table->unsignedBigInteger('id_salle');
            $table->primary(['id_examen', 'id_salle']);
            $table->foreign('id_examen')->references('id_examen')->on('examens')->onDelete('cascade');
            $table->foreign('id_salle')->references('id_salle')->on('salles')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_salle');
    }
};
