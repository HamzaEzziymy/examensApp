<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('commissions', function (Blueprint $table) {
            $table->id('id_commission');
            $table->enum('type_commission', ['Disciplinaire', 'Recours']);
            $table->string('nom_commission', 255)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('membres_commission', function (Blueprint $table) {
            $table->id('id_membre_commission');
            $table->unsignedBigInteger('id_commission')->nullable();
            $table->unsignedBigInteger('id_enseignant')->nullable();
            $table->string('role', 255)->nullable();
            $table->foreign('id_commission')->references('id_commission')->on('commissions')->onDelete('set null');
            $table->foreign('id_enseignant')->references('id_enseignant')->on('enseignants')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('deliberations', function (Blueprint $table) {
            $table->id('id_deliberation');
            $table->unsignedBigInteger('id_session')->nullable(); // sessions_examen.id_session_examen
            $table->unsignedBigInteger('id_niveau')->nullable();
            $table->date('date_deliberation')->nullable();
            $table->enum('statut', ['Planifiee', 'En cours', 'Terminee']);
            $table->foreign('id_session')->references('id_session_examen')->on('sessions_examen')->onDelete('set null');
            $table->foreign('id_niveau')->references('id_niveau')->on('niveaux')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('reclamations', function (Blueprint $table) {
            $table->id('id_reclamation');
            $table->unsignedBigInteger('id_inscription_pedagogique')->nullable();
            $table->unsignedBigInteger('id_element_module')->nullable();
            $table->unsignedBigInteger('id_session_examen')->nullable();
            $table->date('date_reclamation');
            $table->text('motif')->nullable();
            $table->text('decision')->nullable();
            $table->enum('statut', ['Soumise', 'En cours', 'Traitee', 'Rejetee']);
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques')->onDelete('set null');
            $table->foreign('id_element_module')->references('id_element')->on('elements_module')->onDelete('set null');
            $table->foreign('id_session_examen')->references('id_session_examen')->on('sessions_examen')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('decisions_commission', function (Blueprint $table) {
            $table->id('id_decision');
            $table->unsignedBigInteger('id_commission')->nullable();
            $table->unsignedBigInteger('id_cas')->nullable();
            $table->date('date_decision');
            $table->text('decision')->nullable();
            $table->text('sanction')->nullable();
            $table->foreign('id_commission')->references('id_commission')->on('commissions')->onDelete('set null');
            $table->timestamps();
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

