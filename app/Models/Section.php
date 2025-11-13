<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Section extends Model
{
    use HasFactory;

    protected $table = 'sections';
    protected $primaryKey = 'id_section';
    public $timestamps = false;
    protected $guarded = [];

    protected $fillable = [
        'id_filiere',
        'nom_section',
        'langue',
    ];

    public function filiere(): BelongsTo
    {
        return $this->belongsTo(Filiere::class, 'id_filiere', 'id_filiere');
    }

    public function offresFormation(): HasMany
    {
        return $this->hasMany(OffreFormation::class, 'id_section', 'id_section');
    }
}

