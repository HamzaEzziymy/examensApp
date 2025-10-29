<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('salles', function (Blueprint $table) {
            $table->increments('id_salle');
            $table->string('code_salle', 20)->unique();
            $table->string('nom_salle', 100);
            $table->integer('capacite');
            $table->integer('capacite_examens');
            $table->string('batiment', 50)->nullable();
            $table->boolean('est_disponible')->default(true);
            $table->text('specificites')->nullable();
        });

        Schema::create('sessions_examen', function (Blueprint $table) {
            $table->increments('id_session_examen');
            $table->unsignedInteger('id_filiere')->nullable();
            $table->unsignedInteger('id_annee')->nullable();
            $table->string('nom_session', 50);
            $table->enum('type_session', ['Normale', 'Rattrapage', 'Exceptionnelle']);
            $table->date('date_session_examen');
            $table->integer('quadrimestre');
            $table->text('description')->nullable();
            $table->foreign('id_filiere')->references('id_filiere')->on('filieres');
            $table->foreign('id_annee')->references('id_annee')->on('annees_universitaires');
        });

        Schema::create('examens', function (Blueprint $table) {
            $table->increments('id_examen');
            $table->unsignedInteger('id_session_examen')->nullable();
            $table->unsignedInteger('id_module')->nullable();
            $table->unsignedInteger('id_salle')->nullable();
            $table->date('date_examen');
            $table->dateTime('date_debut');
            $table->dateTime('date_fin');
            $table->enum('statut', ['Planifiée', 'En cours', 'Terminée', 'Annulée']);
            $table->text('description')->nullable();
            $table->foreign('id_session_examen')->references('id_session_examen')->on('sessions_examen');
            $table->foreign('id_module')->references('id_module')->on('modules');
            $table->foreign('id_salle')->references('id_salle')->on('salles');
        });
    }

    public function down(): void {
        Schema::dropIfExists('examens');
        Schema::dropIfExists('sessions_examen');
        Schema::dropIfExists('salles');
    }
};
