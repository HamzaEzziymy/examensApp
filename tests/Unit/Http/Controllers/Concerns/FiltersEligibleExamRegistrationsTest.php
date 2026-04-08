<?php

namespace Tests\Unit\Http\Controllers\Concerns;

use App\Http\Controllers\Concerns\FiltersEligibleExamRegistrations;
use PHPUnit\Framework\TestCase;

class FiltersEligibleExamRegistrationsTest extends TestCase
{
    public function test_it_recognizes_rattrapage_result_status_aliases(): void
    {
        $helper = new class {
            use FiltersEligibleExamRegistrations {
                isRattrapageResultStatus as public exposedIsRattrapageResultStatus;
            }
        };

        $this->assertTrue($helper->exposedIsRattrapageResultStatus('Rattrapage'));
        $this->assertTrue($helper->exposedIsRattrapageResultStatus('R'));
        $this->assertTrue($helper->exposedIsRattrapageResultStatus('ratt'));
        $this->assertTrue($helper->exposedIsRattrapageResultStatus('rattrappage'));
        $this->assertFalse($helper->exposedIsRattrapageResultStatus('Valide'));
        $this->assertFalse($helper->exposedIsRattrapageResultStatus(null));
    }
}
