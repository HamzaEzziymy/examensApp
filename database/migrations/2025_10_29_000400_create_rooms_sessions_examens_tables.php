<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('salles', function (Blueprint $table) {
            $table->id('id_salle');
            $table->string('code_salle', 20)->unique();
            $table->string('nom_salle', 100);
            $table->integer('capacite');
            $table->integer('capacite_examens');
            $table->string('batiment', 50)->nullable();
            $table->boolean('est_disponible')->default(true);
            $table->text('specificites')->nullable();
            $table->timestamps();
        });

        Schema::create('sessions_examen', function (Blueprint $table) {
            $table->id('id_session_examen');
            $table->unsignedBigInteger('id_filiere')->nullable();
            $table->unsignedBigInteger('id_annee')->nullable();
            $table->string('nom_session', 50);
            $table->enum('type_session', ['Normale', 'Rattrapage', 'Exceptionnelle']);
            $table->date('date_session_examen');
            $table->integer('quadrimestre');
            $table->text('description')->nullable();
            $table->foreign('id_filiere')->references('id_filiere')->on('filieres')->onDelete('set null');
            $table->foreign('id_annee')->references('id_annee')->on('annees_universitaires')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('examens', function (Blueprint $table) {
            $table->id('id_examen');
            $table->unsignedBigInteger('id_session_examen')->nullable();
            $table->unsignedBigInteger('id_module')->nullable();
            $table->unsignedBigInteger('id_salle')->nullable();
            $table->date('date_examen');
            $table->dateTime('date_debut');
            $table->dateTime('date_fin');
            $table->enum('statut', ['Planifiee', 'En cours', 'Terminee', 'Annulee']);
            $table->text('description')->nullable();
            $table->foreign('id_session_examen')->references('id_session_examen')->on('sessions_examen')->onDelete('set null');
            $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('set null');
            $table->foreign('id_salle')->references('id_salle')->on('salles')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('examens');
        Schema::dropIfExists('sessions_examen');
        Schema::dropIfExists('salles');
    }
};
