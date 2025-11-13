<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Faculte extends Model
{
    use HasFactory;

    protected $table = 'facultes';
    protected $primaryKey = 'id_faculte';
    public $timestamps = false;
    protected $guarded = [];

    protected $fillable = [
        'nom_faculte',
        'entete',
        'logo',
        'adress',
        'phone',
        'email',
        'web',
        'fax',
    ];

    public function filieres(): HasMany
    {
        return $this->hasMany(Filiere::class, 'id_faculte', 'id_faculte');
    }
}

