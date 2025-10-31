<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Salle extends Model
{
    use HasFactory;

    protected $table = 'salles';
    protected $primaryKey = 'id_salle';
    protected $guarded = [];
 protected $fillable = [
        'code_salle','nom_salle','capacite','capacite_examens',
        'batiment','est_disponible','specificites',
    ]; 
    
    public function examens(): HasMany
    {
        return $this->hasMany(Examen::class, 'id_salle', 'id_salle');
    }
}

