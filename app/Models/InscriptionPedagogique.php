<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InscriptionPedagogique extends Model
{
    use HasFactory;

    protected $table = 'inscriptions_pedagogiques';
    protected $primaryKey = 'id_inscription_pedagogique';
    protected $guarded = [];
}

