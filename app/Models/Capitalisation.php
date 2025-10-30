<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Capitalisation extends Model
{
    use HasFactory;

    protected $table = 'capitalisations';
    protected $primaryKey = 'id_capitalisation';
    protected $guarded = [];
}

