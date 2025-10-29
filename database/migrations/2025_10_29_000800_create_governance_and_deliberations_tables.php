<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('commissions', function (Blueprint $table) {
            $table->increments('id_commission');
            $table->enum('type_commission', ['Disciplinaire', 'Recours']);
            $table->string('nom_commission', 255)->nullable();
            $table->text('description')->nullable();
        });

        Schema::create('membres_commission', function (Blueprint $table) {
            $table->increments('id_membre_commission');
            $table->unsignedInteger('id_commission')->nullable();
            $table->unsignedInteger('id_enseignant')->nullable();
            $table->string('role', 255)->nullable();
            $table->foreign('id_commission')->references('id_commission')->on('commissions');
            $table->foreign('id_enseignant')->references('id_enseignant')->on('enseignants');
        });

        Schema::create('deliberations', function (Blueprint $table) {
            $table->increments('id_deliberation');
            $table->unsignedInteger('id_session')->nullable(); // -> sessions_examen.id_session_examen
            $table->unsignedInteger('id_niveau')->nullable();
            $table->date('date_deliberation')->nullable();
            $table->enum('statut', ['Planifiée', 'En cours', 'Terminée']);
            $table->foreign('id_session')->references('id_session_examen')->on('sessions_examen');
            $table->foreign('id_niveau')->references('id_niveau')->on('niveaux');
        });

        Schema::create('reclamations', function (Blueprint $table) {
            $table->increments('id_reclamation');
            $table->unsignedInteger('id_inscription_pedagogique')->nullable();
            $table->unsignedInteger('id_element_module')->nullable();
            $table->unsignedInteger('id_session_examen')->nullable();
            $table->date('date_reclamation');
            $table->text('motif')->nullable();
            $table->text('decision')->nullable();
            $table->enum('statut', ['Soumise', 'En cours', 'Traitée', 'Rejetée']);
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques');
            $table->foreign('id_element_module')->references('id_element')->on('elements_module');
            $table->foreign('id_session_examen')->references('id_session_examen')->on('sessions_examen');
        });

        Schema::create('decisions_commission', function (Blueprint $table) {
            $table->increments('id_decision');
            $table->unsignedInteger('id_commission')->nullable();
            $table->unsignedInteger('id_cas')->nullable();
            $table->date('date_decision');
            $table->text('decision')->nullable();
            $table->text('sanction')->nullable();
            $table->foreign('id_commission')->references('id_commission')->on('commissions');
        });
    }

    public function down(): void {
        Schema::dropIfExists('decisions_commission');
        Schema::dropIfExists('reclamations');
        Schema::dropIfExists('deliberations');
        Schema::dropIfExists('membres_commission');
        Schema::dropIfExists('commissions');
    }
};
