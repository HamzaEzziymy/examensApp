<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('etudiants', function (Blueprint $table) {
            $table->increments('id_etudiant');
            $table->string('cne', 20)->unique();
            $table->string('nom', 50);
            $table->string('prenom', 50);
            $table->string('mail_academique', 100)->unique();
            $table->string('mail_personnel', 100)->unique()->nullable();
            $table->date('date_naissance')->nullable();
            $table->string('telephone', 20)->nullable();
            $table->string('url_photo', 255)->nullable();
            $table->unsignedInteger('id_filiere')->nullable();
            $table->foreign('id_filiere')->references('id_filiere')->on('filieres');
        });

        Schema::create('inscriptions_administratives', function (Blueprint $table) {
            $table->increments('id_inscription_admin');
            $table->unsignedInteger('id_etudiant')->nullable();
            $table->unsignedInteger('id_annee')->nullable();
            $table->unsignedInteger('id_niveau')->nullable();
            $table->date('date_inscription');
            $table->string('statut', 30)->default('Active');
            $table->foreign('id_niveau')->references('id_niveau')->on('niveaux');
            $table->foreign('id_etudiant')->references('id_etudiant')->on('etudiants');
            $table->foreign('id_annee')->references('id_annee')->on('annees_universitaires');
        });

        Schema::create('inscriptions_pedagogiques', function (Blueprint $table) {
            $table->increments('id_inscription_pedagogique');
            $table->unsignedInteger('id_etudiant')->nullable();
            $table->unsignedInteger('id_inscription_admin')->nullable();
            $table->unsignedInteger('id_module')->nullable();
            $table->enum('type_inscription', ['Normal', 'Credit', 'Anticipé']);
            $table->integer('credits_acquis')->default(0);
            $table->foreign('id_etudiant')->references('id_etudiant')->on('etudiants');
            $table->foreign('id_inscription_admin')->references('id_inscription_admin')->on('inscriptions_administratives');
            $table->foreign('id_module')->references('id_module')->on('modules');
        });

        Schema::create('capitalisations', function (Blueprint $table) {
            $table->increments('id_capitalisation');
            $table->unsignedInteger('id_inscription_pedagogique')->nullable();
            $table->unsignedInteger('id_module')->nullable();
            $table->date('date_capitalisation');
            $table->date('date_expiration')->nullable();
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques');
            $table->foreign('id_module')->references('id_module')->on('modules');
        });

        Schema::create('stages', function (Blueprint $table) {
            $table->increments('id_stage');
            $table->unsignedInteger('id_inscription_pedagogique')->nullable();
            $table->unsignedInteger('id_module')->nullable();
            $table->string('nom_hopital', 255)->nullable();
            $table->string('service', 255)->nullable();
            $table->date('date_debut')->nullable();
            $table->date('date_fin')->nullable();
            $table->string('encadrant_hopital', 255)->nullable();
            $table->unsignedInteger('encadrant_faculte')->nullable(); // id_enseignant
            $table->decimal('note_stage', 5, 2)->nullable();
            $table->string('rapport_stage', 255)->nullable();
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques');
            $table->foreign('id_module')->references('id_module')->on('modules');
            $table->foreign('encadrant_faculte')->references('id_enseignant')->on('enseignants');
        });
    }

    public function down(): void {
        Schema::dropIfExists('stages');
        Schema::dropIfExists('capitalisations');
        Schema::dropIfExists('inscriptions_pedagogiques');
        Schema::dropIfExists('inscriptions_administratives');
        Schema::dropIfExists('etudiants');
    }
};
