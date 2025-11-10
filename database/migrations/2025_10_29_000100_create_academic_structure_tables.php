<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('annees_universitaires', function (Blueprint $table) {
            $table->id('id_annee');
            $table->string('annee_univ', 9)->unique();
            $table->date('date_debut');
            $table->date('date_cloture');
            $table->boolean('est_active')->default(false);
            $table->timestamps();
        });

        Schema::create('filieres', function (Blueprint $table) {
            $table->id('id_filiere');
            $table->unsignedBigInteger('id_annee')->nullable();
            $table->string('nom_filiere', 100);
            $table->string('code_filiere')->unique()->nullable();
            $table->foreign('id_annee')->references('id_annee')->on('annees_universitaires')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('niveaux', function (Blueprint $table) {
            $table->id('id_niveau');
            $table->string('code_niveau', 20);
            $table->string('nom_niveau', 100);
            $table->unsignedBigInteger('id_filiere')->nullable();
            // L1=1, L2=2, etc.
            $table->integer('credits_requis');
            $table->foreign('id_filiere')->references('id_filiere')->on('filieres')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('semestres', function (Blueprint $table) {
            $table->id('id_semestre');
            $table->string('code_semestre', 20);
            $table->string('nom_semestre', 100);
            $table->unsignedBigInteger('id_niveau')->nullable();
            $table->integer('credits_requis')->nullable();
            $table->foreign('id_niveau')->references('id_niveau')->on('niveaux')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('modules', function (Blueprint $table) {
            $table->id('id_module');
            $table->string('code_module', 20)->unique();
            $table->string('nom_module', 100);
            $table->string('abreviation_module', 100);
            $table->string('nature', 100);
            $table->unsignedBigInteger('id_niveau')->nullable();
            $table->unsignedBigInteger('id_semestre')->nullable();
            $table->integer('quadrimestre');
            $table->decimal('seuil_validation', 4, 2)->default(10.00);
            $table->decimal('coefficient_module', 4, 2);
            $table->integer('credits_requis')->nullable();
            $table->text('description')->nullable();
            $table->foreign('id_semestre')->references('id_semestre')->on('semestres')->onDelete('set null');
            $table->foreign('id_niveau')->references('id_niveau')->on('niveaux')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('elements_module', function (Blueprint $table) {
            $table->id('id_element');
            $table->unsignedBigInteger('id_module')->nullable();
            $table->string('type_element', 50)->nullable(); // TP, TD, COURS, STAGE
            $table->string('nom_element', 100);
            $table->decimal('coefficient_element', 4, 2);
            $table->decimal('seuil_validation', 4, 2)->default(10.00);
            $table->boolean('est_obligatoire')->default(true);
            $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('elements_module');
        Schema::dropIfExists('modules');
        Schema::dropIfExists('semestres');
        Schema::dropIfExists('niveaux');
        Schema::dropIfExists('filieres');
        Schema::dropIfExists('annees_universitaires');
    }
};
