<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('surveillants', function (Blueprint $table) {
            $table->id('id_surveillant');
            $table->string('nom_surveillant', 100);
            $table->string('prenom_surveillant', 100);
            $table->string('mail_surveillant', 100)->unique();
            $table->string('telephone_surveillant', 20)->nullable();
            $table->enum('type_surveillant', ['Administrateur', 'Docteur']);
            $table->boolean('disponibilites')->default(true);
            $table->timestamps();
        });

        Schema::create('surveillances', function (Blueprint $table) {
            $table->id('id_surveillance');
            $table->unsignedBigInteger('id_examen')->nullable();
            $table->unsignedBigInteger('id_surveillant')->nullable();
            $table->enum('role', ['Principal', 'Assistant']);
            $table->time('heure_debut')->nullable();
            $table->time('heure_fin')->nullable();
            $table->text('observations')->nullable();
            $table->foreign('id_examen')->references('id_examen')->on('examens')->onDelete('set null');
            $table->foreign('id_surveillant')->references('id_surveillant')->on('surveillants')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('anonymat', function (Blueprint $table) {
            $table->id('id_anonymat');
            $table->unsignedBigInteger('id_examen')->nullable();
            $table->unsignedBigInteger('id_inscription_pedagogique')->nullable();
            $table->string('code_anonymat', 20);
            $table->foreign('id_examen')->references('id_examen')->on('examens')->onDelete('set null');
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('repartition_etudiants', function (Blueprint $table) {
            $table->id('id_repartition');
            $table->unsignedBigInteger('id_examen')->nullable();
            $table->unsignedBigInteger('id_inscription_pedagogique')->nullable();
            $table->integer('code_grille');
            $table->string('code_anonymat', 20)->nullable();
            $table->string('numero_place', 10)->nullable();
            $table->boolean('present')->default(false);
            $table->time('heure_arrivee')->nullable();
            $table->time('heure_sortie')->nullable();
            $table->text('observation')->nullable();
            $table->foreign('id_examen')->references('id_examen')->on('examens')->onDelete('set null');
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('absences', function (Blueprint $table) {
            $table->id('id_absence');
            $table->unsignedBigInteger('id_examen')->nullable();
            $table->unsignedBigInteger('id_anonymat')->nullable();
            $table->date('date_absence');
            $table->text('motif')->nullable();
            $table->string('justificatif', 255)->nullable();
            $table->enum('statut', ['Non justifiee', 'Justifiee', 'En attente']);
            $table->foreign('id_examen')->references('id_examen')->on('examens')->onDelete('set null');
            $table->foreign('id_anonymat')->references('id_anonymat')->on('anonymat')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('incidents_examens', function (Blueprint $table) {
            $table->id('id_incident');
            $table->unsignedBigInteger('id_anonymat')->nullable();
            $table->unsignedBigInteger('id_surveillance')->nullable();
            $table->string('type_incident', 100);
            $table->text('description')->nullable();
            $table->time('heure_incident');
            $table->text('mesures_prises')->nullable();
            $table->foreign('id_anonymat')->references('id_anonymat')->on('anonymat')->onDelete('set null');
            $table->foreign('id_surveillance')->references('id_surveillance')->on('surveillances')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('pv_examens', function (Blueprint $table) {
            $table->id('id_pv');
            $table->unsignedBigInteger('id_examen')->nullable();
            $table->dateTime('date_creation')->useCurrent();
            $table->integer('nombre_presents')->nullable();
            $table->integer('nombre_absents')->nullable();
            $table->boolean('incidents_signales')->default(false);
            $table->text('observations')->nullable();
            $table->foreign('id_examen')->references('id_examen')->on('examens')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('pv_examens');
        Schema::dropIfExists('incidents_examens');
        Schema::dropIfExists('absences');
        Schema::dropIfExists('repartition_etudiants');
        Schema::dropIfExists('anonymat');
        Schema::dropIfExists('surveillances');
        Schema::dropIfExists('surveillants');
    }
};
