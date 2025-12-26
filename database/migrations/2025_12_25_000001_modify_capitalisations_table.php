<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('capitalisations', function (Blueprint $table) {
            // Drop old foreign keys
            $table->dropForeign(['id_inscription_pedagogique']);
            $table->dropForeign(['id_module']);
            
            // Drop old columns
            $table->dropColumn(['id_inscription_pedagogique', 'id_module']);
        });

        Schema::table('capitalisations', function (Blueprint $table) {
            // Add new columns
            $table->unsignedBigInteger('id_inscription_admin')->nullable()->after('id_capitalisation');
            $table->unsignedBigInteger('id_offre')->nullable()->after('id_inscription_admin');
            $table->decimal('note', 5, 2)->nullable()->after('id_offre');
            
            // Add new foreign keys
            $table->foreign('id_inscription_admin')->references('id_inscription_admin')->on('inscriptions_administratives')->onDelete('set null');
            $table->foreign('id_offre')->references('id_offre')->on('offre_formation')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('capitalisations', function (Blueprint $table) {
            $table->dropForeign(['id_inscription_admin']);
            $table->dropForeign(['id_offre']);
            $table->dropColumn(['id_inscription_admin', 'id_offre', 'note']);
        });

        Schema::table('capitalisations', function (Blueprint $table) {
            $table->unsignedBigInteger('id_inscription_pedagogique')->nullable();
            $table->unsignedBigInteger('id_module')->nullable();
            $table->foreign('id_inscription_pedagogique')->references('id_inscription_pedagogique')->on('inscriptions_pedagogiques')->onDelete('set null');
            $table->foreign('id_module')->references('id_module')->on('modules')->onDelete('set null');
        });
    }
};
