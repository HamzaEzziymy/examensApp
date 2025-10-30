<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentExamen extends Model
{
    use HasFactory;

    protected $table = 'incidents_examens';
    protected $primaryKey = 'id_incident';
    protected $guarded = [];

    public function anonymat(): BelongsTo
    {
        return $this->belongsTo(Anonymat::class, 'id_anonymat', 'id_anonymat');
    }

    public function surveillance(): BelongsTo
    {
        return $this->belongsTo(Surveillance::class, 'id_surveillance', 'id_surveillance');
    }
}

