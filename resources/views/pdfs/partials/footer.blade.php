<style>
    .pdf-pagination-footer {
        width: 80%;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        color: #444;
        text-align: center;
        padding: 2px 0 1px;
        margin: 0 auto;
        box-sizing: border-box;
    }
    .pdf-pagination-footer .meta {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
    }
</style>

@php
    $exam = $examen ?? null;
    $modulesList = ($modules ?? collect());
    $sessionLabel = $sessionName ?? ($exam->sessionExamen->nom_session ?? '-');
    $dateLabel = optional($firstExamDate ?? $exam->date_examen ?? null)->format('d/m/Y') ?? '-';
    $salleLabel = collect($exam?->salles ?? [])
        ->pluck('nom_salle')
        ->filter()
        ->unique()
        ->implode(' | ');
    if (empty($salleLabel)) {
        $salleLabel = $exam?->salle?->nom_salle ?? '-';
    }
    $niveauLabel = $niveauFiliere ?? ($exam?->module?->offresFormation?->first()?->semestre?->niveau?->nom_niveau ?? '');
    $semestreLabel = $modulesList->pluck('semestre')->filter()->first()
        ?? ($exam?->module?->offresFormation?->first()?->semestre?->nom_semestre ?? '');
@endphp

<footer class="pdf-pagination-footer">
    <span class="meta">
        <span>Salle: {{ $salleLabel }}</span>
        <span>Session: {{ $sessionLabel }}</span>
        <span>Niveau: {{ $niveauLabel ?: '-' }}</span>
        <span>Semestre: {{ $semestreLabel ?: '-' }}</span>
    </span>
    <span>| Page @pageNumber / @totalPages</span>
</footer>
