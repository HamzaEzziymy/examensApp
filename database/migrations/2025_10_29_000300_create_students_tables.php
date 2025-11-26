<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('etudiants', function (Blueprint $table) {
            $table->id('id_etudiant');
            $table->string('cne', 20)->unique();
            $table->string('nom', 50);
            $table->string('prenom', 50);
            $table->string('nasionalite', 50);
            $table->string('mail_academique', 100)->unique();
            $table->string('mail_personnel', 100)->unique()->nullable();
            $table->date('date_naissance')->nullable();
            $table->string('telephone', 20)->nullable();
            $table->string('url_photo', 255)->nullable();
            $table->unsignedBigInteger('id_filiere')->nullable();
            $table->unsignedBigInteger('id_section')->nullable();
            $table->foreign('id_filiere')->references('id_filiere')->on('filieres')->onDelete('set null');
            $table->foreign('id_section')->references('id_section')->on('sections')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('inscriptions_administratives', function (Blueprint $table) {
            $table->id('id_inscription_admin');
            $table->unsignedBigInteger('id_etudiant')->nullable();
            $table->unsignedBigInteger('id_annee')->nullable();
            $table->unsignedBigInteger('id_niveau')->nullable();
            $table->unsignedBigInteger('id_filiere')->nullable();
            $table->unsignedBigInteger('id_section')->nullable();
            $table->date('date_inscription');
            $table->string('statut', 30)->default('Active');
            $table->enum('type_inscription', ['nouveau', 'redoublant', 'transfert']);
            $table->foreign('id_niveau')->references('id_niveau')->on('niveaux')->onDelete('set null');
            $table->foreign('id_etudiant')->references('id_etudiant')->on('etudiants')->onDelete('set null');
            $table->foreign('id_annee')->references('id_annee')->on('annees_universitaires')->onDelete('set null');
            $table->foreign('id_filiere')->references('id_filiere')->on('filieres')->onDelete('set null');
            $table->foreign('id_section')->references('id_section')->on('sections')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('inscriptions_pedagogiques', function (Blueprint $table) {
            $table->id('id_inscription_pedagogique');
            $table->unsignedBigInteger('id_inscription_admin')->nullable();
            $table->unsignedBigInteger('id_offre')->nullable();
            $table->unsignedBigInteger('id_etudiant')->nullable();
            $table->unsignedBigInteger('id_module')->nullable();
            $table->enum('type_inscription', ['Normal', 'Credit', 'Anticipe']);
            $table->integer('credits_acquis')->default(0);
            $table->foreign('id_inscription_admin')->references('id_inscription_admin')->on('inscriptions_administratives')->onDelete('set null');
            $table->foreign('id_offre')->references('id_offre')->on('offre_formation')->onDelete('set null');
            $table->foreign('id_etudiant')->references('id_etudiant')->on('etudiants')->onDelete('set null');
            $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('capitalisations', function (Blueprint $table) {
            $table->id('id_capitalisation');
            $table->unsignedBigInteger('id_inscription_pedagogique')->nullable();
            $table->unsignedBigInteger('id_module')->nullable();
            $table->date('date_capitalisation');
            $table->date('date_expiration')->nullable();
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques')->onDelete('set null');
            $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('stages', function (Blueprint $table) {
            $table->id('id_stage');
            $table->unsignedBigInteger('id_inscription_pedagogique')->nullable();
            $table->unsignedBigInteger('id_module')->nullable();
            $table->string('nom_hopital', 255)->nullable();
            $table->string('service', 255)->nullable();
            $table->date('date_debut')->nullable();
            $table->date('date_fin')->nullable();
            $table->string('encadrant_hopital', 255)->nullable();
            $table->unsignedBigInteger('encadrant_faculte')->nullable(); // id_enseignant
            $table->decimal('note_stage', 5, 2)->nullable();
            $table->string('rapport_stage', 255)->nullable();
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques')->onDelete('set null');
            $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('set null');
            $table->foreign('encadrant_faculte')->references('id_enseignant')->on('enseignants')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stages');
        Schema::dropIfExists('capitalisations');
        Schema::dropIfExists('inscriptions_pedagogiques');
        Schema::dropIfExists('inscriptions_administratives');
        Schema::dropIfExists('etudiants');
    }
};
