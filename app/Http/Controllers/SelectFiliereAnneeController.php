<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserFiliereAnnee;
use Illuminate\Http\Request;

class SelectFiliereAnneeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {

    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {

        //if exests, update else create
        $validated = $request->validate([
            'id_filiere' => ['required', 'exists:filieres,id_filiere'],
            'id_annee' => ['required', 'exists:annees_universitaires,id_annee'],
        ]);

        $id_ = $request->id;
        $userFiliereAnnee = UserFiliereAnnee::find($id_);
        $userFiliereAnnee->update($validated);
        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
