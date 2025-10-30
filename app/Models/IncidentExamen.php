<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IncidentExamen extends Model
{
    use HasFactory;

    protected $table = 'incidents_examens';
    protected $primaryKey = 'id_incident';
    protected $guarded = [];
}

