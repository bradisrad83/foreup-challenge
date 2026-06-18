<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favorites', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('favorite_list_id')
                ->constrained('favorite_lists')
                ->onDelete('cascade');
            $table->unsignedBigInteger('external_id');
            $table->string('name');
            $table->string('image_url')->nullable();
            $table->text('summary')->nullable();
            $table->date('premiered')->nullable();
            $table->date('ended')->nullable();
            $table->string('status')->nullable();
            $table->json('genres')->nullable();
            $table->float('rating')->nullable();
            $table->string('language')->nullable();
            $table->string('network')->nullable();
            $table->string('official_url')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['favorite_list_id', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favorites');
    }
};
