<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SessionExamen extends Model
{
    use HasFactory;

    protected $table = 'sessions_examen';
    protected $primaryKey = 'id_session_examen';
    protected $guarded = [];
}

