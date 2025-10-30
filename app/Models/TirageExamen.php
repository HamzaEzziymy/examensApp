<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TirageExamen extends Model
{
    use HasFactory;

    protected $table = 'tirages_examens';
    protected $primaryKey = 'id_tirage';
    protected $guarded = [];
}

