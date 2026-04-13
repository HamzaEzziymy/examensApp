<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('module_validation_rules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_filiere');
            $table->unsignedBigInteger('id_module');
            $table->decimal('module_pass_threshold', 4, 2)->default(10.00);
            $table->boolean('enforce_all_elements_threshold')->default(false);
            $table->decimal('element_pass_threshold', 4, 2)->nullable();
            $table->timestamps();

            $table->unique(['id_filiere', 'id_module'], 'module_validation_rules_unique_scope');
            $table->foreign('id_filiere')->references('id_filiere')->on('filieres')->onDelete('cascade');
            $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('module_validation_rules');
    }
};
