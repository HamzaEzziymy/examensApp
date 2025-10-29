<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('sujets_examens', function (Blueprint $table) {
            $table->increments('id_sujet');
            $table->unsignedInteger('id_examen');
            $table->string('version_sujet', 50)->default('Principal');
            $table->string('chemin_fichier', 255);
            $table->unsignedInteger('id_auteur'); // id_enseignant
            $table->timestamp('date_creation')->useCurrent();
            $table->enum('statut', ['Brouillon', 'Validé', 'Prêt pour tirage']);
            $table->foreign('id_examen')->references('id_examen')->on('examens')->onDelete('cascade');
            $table->foreign('id_auteur')->references('id_enseignant')->on('enseignants');
        });

        Schema::create('grilles_correction', function (Blueprint $table) {
            $table->increments('id_grille');
            $table->unsignedInteger('id_sujet')->unique();
            $table->enum('type_grille', ['QCM', 'Bareme']);
            $table->json('contenu_grille');
            $table->decimal('note_maximale', 5, 2);
            $table->unsignedInteger('id_auteur'); // id_enseignant
            $table->timestamp('date_creation')->useCurrent();
            $table->foreign('id_sujet')->references('id_sujet')->on('sujets_examens')->onDelete('cascade');
            $table->foreign('id_auteur')->references('id_enseignant')->on('enseignants');
        });

        Schema::create('tirages_examens', function (Blueprint $table) {
            $table->increments('id_tirage');
            $table->unsignedInteger('id_sujet');
            $table->unsignedInteger('id_fonctionnaire'); // FK omitted: table not provided
            $table->timestamp('date_tirage')->useCurrent();
            $table->integer('nombre_copies');
            $table->text('details_conditionnement')->nullable();
            $table->foreign('id_sujet')->references('id_sujet')->on('sujets_examens');
        });
    }

    public function down(): void {
        Schema::dropIfExists('tirages_examens');
        Schema::dropIfExists('grilles_correction');
        Schema::dropIfExists('sujets_examens');
    }
};
