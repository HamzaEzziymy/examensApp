<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SujetExamen extends Model
{
    use HasFactory;

    protected $table = 'sujets_examens';
    protected $primaryKey = 'id_sujet';
    protected $guarded = [];
}

